import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { spawn } from 'child_process';

const USER_DATA_DIR = './user_data';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadImage(page, url, filepath) {
    try {
        const viewSource = await page.goto(url);
        fs.writeFileSync(filepath, await viewSource.buffer());
    } catch (e) {
        // If navigation fails (e.g., blob urls), we can evaluate in browser to download it
        try {
            const dataUrl = await page.evaluate(async (imgUrl) => {
                const response = await fetch(imgUrl);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }, url);
            
            if (dataUrl) {
                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(filepath, buffer);
            }
        } catch (err) {
            console.error('Failed to download image:', url, err.message);
        }
    }
}

export async function runImageGeneration(imageCountArg, type = 'lineart', theme = '', loopIndex = null) {
    const IMAGE_COUNT = imageCountArg !== undefined ? imageCountArg : 1;
    console.log(`Starting Gemini Headless Image Generator [Mode: ${type.toUpperCase()}] [Theme: ${theme || 'Default'}]...`);
    
    // Dynamic data scoping
    const safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
    const PROMPTS_FILE = type === 'lineart' ? './prompts.txt' : './draft_prompts.txt';
    const REFERENCES_DIR = type === 'lineart' ? './references' : './draft_references';
    const outputBase = type === 'draft' ? (safeTheme ? `./draft_downloads/${safeTheme}` : './draft_downloads') : (safeTheme ? `./line art/${safeTheme}` : './line art');
    const DOWNLOADS_DIR = path.resolve(outputBase);

    // Create uniquely isolated download temp directory for this specific run natively perfectly eliminating race conditions
    const uniqueTaskId = crypto.randomBytes(6).toString('hex');
    const tempDownloadDir = path.resolve(DOWNLOADS_DIR, `.temp_${Date.now()}_${uniqueTaskId}`);
    if (!fs.existsSync(tempDownloadDir)) fs.mkdirSync(tempDownloadDir, { recursive: true });

    // Ensure necessary directories and files exist
    if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    if (!fs.existsSync(REFERENCES_DIR)) fs.mkdirSync(REFERENCES_DIR, { recursive: true });
    if (!fs.existsSync(PROMPTS_FILE)) fs.writeFileSync(PROMPTS_FILE, '', 'utf-8');

    // Gather all reference images from the local payload folder
    let referenceImages = [];
    if (fs.existsSync(REFERENCES_DIR)) {
        referenceImages = fs.readdirSync(REFERENCES_DIR)
            .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i))
            .map(f => path.resolve(REFERENCES_DIR, f));
    }
    
    // Setup background download tracking
    let expectedDownloads = 0;
    let completedDownloads = 0;
    
    let isWatching = true;
    
    // Background watcher that runs independently
    const watchDownloads = async () => {
        while (isWatching) {
            try {
                if (!fs.existsSync(tempDownloadDir)) {
                    await sleep(1500);
                    continue;
                }
                const files = fs.readdirSync(tempDownloadDir);
                for (const file of files) {
                    if (file.endsWith('.crdownload') || file.endsWith('.tmp') || !file.match(/\.(jpe?g|png|gif|webp)$/i)) continue;
                    
                    const filePath = path.join(tempDownloadDir, file);
                    await sleep(500); // Wait briefly to avoid filesystem locks
                        
                        const ext = path.extname(file) || '.png';
                        let basePrefix = loopIndex ? String(loopIndex) : `gemini_gen_${Date.now()}`;
                        let suffix = 0;
                        let destPath;
                        while(true) {
                            const name = suffix === 0 ? `${basePrefix}${ext}` : `${basePrefix}_var${suffix}${ext}`;
                            destPath = path.join(DOWNLOADS_DIR, name);
                            if (!fs.existsSync(destPath)) break;
                            suffix++;
                        }
                        
                        try {
                            fs.copyFileSync(filePath, destPath);
                            fs.unlinkSync(filePath);
                            completedDownloads++;
                            console.log(`\n✅ [Background] Retrieved ${file}! (${completedDownloads}/${expectedDownloads} finished)\n`);
                        } catch (moveErr) {
                            // File likely locked by Chrome, will try again next loop
                        }
                }
            } catch (e) {}
            await sleep(1500); // Check every 1.5 seconds
        }
    };
    
    // Start watcher without awaiting
    watchDownloads();
    
    // Read multi-line prompts separated by `---`
    let prompts = [];
    try {
        const rawText = fs.readFileSync(PROMPTS_FILE, 'utf-8');
        // Handle both simple newlines (if no separator) and standard `---` separators
        prompts = rawText.includes('---') 
            ? rawText.split(/^---$/m).map(p => p.trim()).filter(p => p.length > 0)
            : [rawText.trim()]; // If no separator is found, treat the entire file as ONE single massive prompt
    } catch (err) {
        throw new Error(`Could not read ${PROMPTS_FILE}. Please make sure it exists.`);
    }

    if (prompts.length === 0) {
        console.log('No prompts found in prompts.txt. Please add some and try again.');
        return;
    }

    console.log(`Loaded ${prompts.length} prompts.`);

    // Connect to existing browser or launch it automatically
    console.log('Ensuring isolated Chrome is running on port 9222...');
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        console.log('Connected to already-running Chrome!');
    } catch (e) {
        console.log('Chrome is not running yet. Auto-launching it now...');
        const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        const userDataPath = path.resolve(USER_DATA_DIR);
        
        const chromeProcess = spawn(chromeExe, [
            '--remote-debugging-port=9222',
            `--user-data-dir=${userDataPath}`
        ], { detached: true, stdio: 'ignore' });
        chromeProcess.unref(); // Detach so the script can exit while Chrome stays open
        
        console.log('Waiting for Chrome to initialize...');
        await sleep(4000);
        
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: { width: 1280, height: 800 }
            });
            console.log('Successfully connected to auto-launched Chrome!');
        } catch (err) {
            throw new Error('ERROR: Could not connect to the newly launched Chrome.');
        }
    }

    const authPage = await browser.newPage();
    const authClient = await authPage.target().createCDPSession();
    await authClient.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tempDownloadDir });

    console.log('Navigating to Gemini...');
    await authPage.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });

    // Login Check loop
    console.log('Checking login status. If you are redirected to a login page, please sign in manually.');
    while (true) {
        const url = authPage.url();
        if (url.includes('accounts.google.com')) {
            console.log('Waiting for manual login... Please complete the login in the browser window.');
            await sleep(5000);
        } else if (url.includes('gemini.google.com')) {
            // Might still be loading the app
            try {
                // Wait for the chat input box to ensure we are fully logged in
                await authPage.waitForSelector('rich-textarea p, textarea', { timeout: 5000 });
                console.log('Successfully logged in and chat interface is ready!');
                break;
            } catch (e) {
                // Still loading or maybe another interstitial
                await sleep(2000);
            }
        } else {
            await sleep(2000);
        }
    }

    // Process prompts
    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        
        for (let variation = 0; variation < IMAGE_COUNT; variation++) {
            let page;
            try {
                console.log(`\n[${i + 1}/${prompts.length}] Processing prompt: "${prompt}" (Generation ${variation + 1}/${IMAGE_COUNT})`);
            
            // Check if the OS implicitly already holds the completed variation payload securely from a prior execution boundary natively
            if (loopIndex !== null) {
                const basePrefix = String(loopIndex);
                const possibleName = variation === 0 ? basePrefix : `${basePrefix}_var${variation}`;
                const existingFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(possibleName + '.'));
                if (existingFiles.length > 0) {
                    console.log(`[Cache Hit] Image heavily cached natively on OS payload (${existingFiles[0]}). Bypassing Google Gemini pings redundantly!`);
                    if (i === 0 && variation === 0) { try { await authPage.close(); } catch(e){} }
                    continue; 
                }
            }
            
            // Reuse the auth tab for the first generation natively preventing visual reload glitch
            if (i === 0 && variation === 0) {
                page = authPage;
            } else {
                page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                const client = await page.target().createCDPSession();
                await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tempDownloadDir });
                await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });
            }
            
            // 1. Find the text input area
            const inputSelector = 'rich-textarea p, textarea, [contenteditable="true"]';
            await page.waitForSelector(inputSelector, { visible: true });
            
            // Give Gemini's heavy javascript interface an extra second to completely finish rendering
            await sleep(1500); 
            
            // Proactively tag any existing images inside Shadow DOMs so we don't accidentally download them
            await page.evaluate(() => {
                function findAllShadow(selector, root = document) {
                    let found = Array.from(root.querySelectorAll(selector));
                    const allElements = root.querySelectorAll('*');
                    for (const el of allElements) {
                        if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                    }
                    return found;
                }
                findAllShadow('img[src*="googleusercontent.com"], img[src^="blob:"]').forEach(img => img.dataset.downloaded = 'true');
            });

            // 2. Type prompt
            let submitted = false;
            let p = prompt.trim();
            
            // Clear existing text just in case
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) {
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                }
            }, inputSelector);
            await sleep(500);

            // Paste the prompt directly into the box
            await page.evaluate((text, sel) => {
                const el = document.querySelector(sel);
                if (el) {
                    el.focus();
                    document.execCommand('insertText', false, text);
                }
            }, p, inputSelector);
            await sleep(1000);

            // 3. Upload Reference Images via simulated Paste
            if (referenceImages.length > 0) {
                console.log(`Simulating Paste for ${referenceImages.length} reference images into the chat...`);
                
                const imagesAsBase64 = referenceImages.map(img => {
                    const ext = path.extname(img).toLowerCase();
                    const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
                    return {
                        mime: mime,
                        name: path.basename(img),
                        data: fs.readFileSync(img).toString('base64')
                    };
                });
                
                await page.evaluate(async (images, sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return;
                    
                    for (const img of images) {
                        const res = await fetch(`data:${img.mime};base64,${img.data}`);
                        const blob = await res.blob();
                        const file = new File([blob], img.name, { type: img.mime });
                        
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        
                        const pasteEvent = new ClipboardEvent('paste', {
                            clipboardData: dataTransfer,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        el.focus();
                        el.dispatchEvent(pasteEvent);
                        
                        // Brief pause between each pasted image
                        await new Promise(r => setTimeout(r, 800));
                    }
                }, imagesAsBase64, inputSelector);
                
            }

            // 4. Submit with active polling for upload completion and Google backend cancellations
            if (referenceImages.length > 0) {
                console.log('Images pasted natively. Waiting exactly 5.5 seconds for Gemini to process the local buffers natively before submitting...');
                await sleep(5500);
            }
            
            let enterClicks = 0;
            // Poll for up to 60 seconds (approx 30 tries at 2s intervals)
            for (let tries = 0; tries < 30; tries++) {
                await page.focus(inputSelector);
                await page.keyboard.press('Enter');
                enterClicks++;
                
                if (enterClicks === 1 && referenceImages.length === 0) {
                    console.log('Pressed Enter. Waiting to see if generation sustains...');
                }
                
                await sleep(2000);
                
                const postSubmitVal = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    return el ? (el.value || el.innerText || '').trim() : '';
                }, inputSelector);
                
                if (postSubmitVal.length < 5) {
                    // The box is empty, meaning it successfully pushed through!
                    // Wait an extra 2.5 seconds to ensure Google didn't immediately anti-bot bounce it back
                    await sleep(2500);
                    const doubleCheck = await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        return el ? (el.value || el.innerText || '').trim() : '';
                    }, inputSelector);
                    
                    if (doubleCheck.length < 5) {
                        submitted = true;
                        console.log('Successfully submitted and generating!');
                        break;
                    } else {
                        console.log('Google cancelled the generation (anti-bot triggered). Resubmitting naturally...');
                    }
                }
            }
            
            if (!submitted) {
                console.log('Error: Google kept cancelling the prompt. Skipping to the next one.');
                if (page && page !== authPage) {
                    try { await page.close(); } catch (e) {}
                } else {
                    await page.keyboard.down('Control');
                    await page.keyboard.press('A');
                    await page.keyboard.up('Control');
                    await page.keyboard.press('Backspace');
                }
                continue;
            }

            console.log('Prompt successfully submitted. Waiting a mandatory 20 seconds for the heavy base rendering to complete natively...');
            await sleep(20000);
            console.log('Base rendering time elapsed! Polling for complete stabilization...');

            // 4. Wait for generation to completely finish
            let lastHTML = '';
            let stableCount = 0;
            while (true) {
                await sleep(1000); // Check natively every 1000ms natively cutting ping latency in half
                let currentHTML = lastHTML;
                try {
                    currentHTML = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
                } catch (err) {}
                if (currentHTML === lastHTML && currentHTML > 0) {
                    stableCount++;
                    if (stableCount >= 2) { // Total 2s stability perfectly confirming output safely
                        console.log('Generation perfectly complete internally natively! Moving instantly...');
                        break;
                    }
                } else {
                    lastHTML = currentHTML;
                    stableCount = 0;
                }
            }

            // 5. Download the images by opening the Lightbox / Gallery
            console.log('Images generated! Triggering native downloads...');
            
            let secondaryDownloadAttempt = false;

            while (true) { // Outer 30s Double-Click OS Logic
                let cumulativeClicks = 0;
                let downloadAttempts = 0;
                
                while (downloadAttempts < 5) { // Internal DOM Polling natively rescuing async DOMs safely
                    downloadAttempts++;
                    const clicksThisRound = await page.evaluate(async (refCount) => {
                    const sleep = ms => new Promise(r => setTimeout(r, ms));
                    let clicks = 0;
                    
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        const allElements = root.querySelectorAll('*');
                        for (const el of allElements) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                
                const allImages = findAllShadow('img[src*="googleusercontent.com"], img[src^="blob:"]');
                let untaggedImages = allImages.filter(img => !img.dataset.downloaded);
                
                // Mathematically ignore reference images: Since this is a completely fresh tab perfectly isolated,
                // the new untagged images will exactly sequence as: [Reference Payload] -> [Gemini Generation].
                if (refCount > 0) {
                    untaggedImages = untaggedImages.slice(refCount);
                }
                
                for (let i = 0; i < untaggedImages.length; i++) {
                    const img = untaggedImages[i];
                    
                    // Fix for "below the fold" issues: scroll the image natively into viewport
                    try { img.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(err){}
                    
                    // Forcefully synthesize a Native React Mouse Hover event breaking Google's layout encapsulation visually
                    try {
                        const hoverEvent = new MouseEvent('mouseover', { view: window, bubbles: true, cancelable: true });
                        img.dispatchEvent(hoverEvent);
                        if (img.parentElement) img.parentElement.dispatchEvent(hoverEvent);
                    } catch(err) {}

                    await sleep(350); 
                    
                    let curr = img.parentElement;
                    let foundDirectBtn = null;
                    for (let lvl = 0; lvl < 8; lvl++) {
                        if (!curr) break;
                        let possibleIcons = findAllShadow('[data-mat-icon-name*="ownload" i], [aria-label*="ownload" i], [mattooltip*="ownload" i], [data-test-id*="ownload" i]', curr);
                        if (possibleIcons.length > 0) {
                            foundDirectBtn = possibleIcons[0].closest('button') || possibleIcons[0];
                            break;
                        }
                        curr = curr.parentElement || curr.getRootNode()?.host; 
                    }
                    
                    if (foundDirectBtn) {
                        foundDirectBtn.click();
                        img.dataset.downloaded = 'true';
                        clicks++;
                        await sleep(500);
                    } else {
                        img.click();
                        if (img.parentElement) img.parentElement.click();
                        
                        let secondaryIcons = [];
                        let waited = 0;
                        while (waited < 15000) {
                            secondaryIcons = findAllShadow('button [data-mat-icon-name*="ownload" i], button[aria-label*="ownload" i], [mattooltip*="ownload" i], [data-test-id*="ownload" i]');
                            if (secondaryIcons.length === 0) secondaryIcons = findAllShadow('[data-mat-icon-name*="ownload" i], [aria-label*="ownload" i], svg[aria-label*="ownload" i]');
                            if (secondaryIcons.length > 0) break;
                            await sleep(500);
                            waited += 500;
                        }
                        
                        if (secondaryIcons.length > 0) {
                            const targetIcon = secondaryIcons[secondaryIcons.length - 1];
                            const dlButton = targetIcon.closest('button') || targetIcon.parentElement || targetIcon.getRootNode()?.host || targetIcon;
                            if (dlButton) {
                                dlButton.click();
                                img.dataset.downloaded = 'true';
                                clicks++;
                                await sleep(800);
                            }
                        }
                        
                        // Force escape the lightbox natively
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                        await sleep(1500);
                    }
                }
                return clicks;
            }, referenceImages.length);
            
                cumulativeClicks += clicksThisRound;
                
                const remainingUntagged = await page.evaluate((refCount) => {
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        const allElements = root.querySelectorAll('*');
                        for (const el of allElements) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                    
                    const allImages = findAllShadow('img[src*="googleusercontent.com"], img[src^="blob:"]');
                    let untag = allImages.filter(img => !img.dataset.downloaded);
                    if (refCount > 0) untag = untag.slice(refCount);
                    return untag.length;
                }, referenceImages.length);

                if (remainingUntagged === 0 && cumulativeClicks > 0) {
                    break;
                } else if (remainingUntagged === 0 && cumulativeClicks === 0) {
                    console.log(`[Download Probe ${downloadAttempts}/5] Zero output images detected visually. Assuming Google API network latency cleanly... Sleeping 5s natively re-polling...`);
                    await sleep(5000);
                } else {
                    console.log(`[Download Probe ${downloadAttempts}/5] Chrome inherently missed ${remainingUntagged} valid OS bytes inline logically. Sleeping 5s natively re-polling...`);
                    await sleep(5000);
                }
            } // Safely closes While (downloadAttempts < 5) organically

            if (cumulativeClicks === 0) throw new Error("Fatal Assertion: Gemini natively printed output buffers, but Chromium consistently failed to isolate any native download buttons completely natively. Aborting cleanly.");
            
            expectedDownloads += cumulativeClicks;
            console.log(`Successfully dispatched ${cumulativeClicks} downloads! Waiting up to 30s for physical completion...`);

            // Check completion for 30s exclusively natively
            let timeoutCounter = 0;
            while (completedDownloads < expectedDownloads && timeoutCounter < 30) {
                await sleep(1000);
                timeoutCounter++;
            }
            
            if (completedDownloads >= expectedDownloads) {
                console.log('All image retrievals strictly complete natively! Sweeping up the tab...');
                try { await page.close(); } catch (e) {}
                break; // All downloads physically succeeded organically exiting safely natively
            }
            
            if (!secondaryDownloadAttempt) {
                console.log(`WARNING: Only ${completedDownloads}/${expectedDownloads} finished resolving in 30s. Scrubbing internal markers and triggering a second batch click natively!`);
                secondaryDownloadAttempt = true;
                await page.evaluate(() => {
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        const allElements = root.querySelectorAll('*');
                        for (const el of allElements) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                    const allImages = findAllShadow('img[src*="googleusercontent.com"], img[src^="blob:"]');
                    allImages.forEach(img => delete img.dataset.downloaded);
                });
            } else {
                try { await page.close(); } catch (e) {}
                throw new Error(`Chromium network downloads powerfully hung natively after 60 total seconds securely (${completedDownloads}/${expectedDownloads}). Aborting generation natively to forcefully cycle OS Tab.`);
            }
        }
            } catch (err) {
                console.error(`\n❌ [ERROR] Fatal failure during Prompt ${i + 1}, Variation ${variation + 1}:`);
                console.error(err);
                console.log(`Skipping to next iteration to ensure overnight batch continues cleanly.`);
                if (page && page !== authPage) {
                    try { await page.close(); } catch (e) {}
                }
            }
            // Small delay before the next variation tab
            await sleep(2000);
        }
    }

    console.log(`\nAll prompts processed! Triggered a total of ${expectedDownloads} downloads.`);
    
    isWatching = false;
    // Clean up purely isolated native temp directory identically preserving system integrity natively
    try { fs.rmSync(tempDownloadDir, { recursive: true, force: true }); } catch (e) {}
    console.log('\nProcess totally complete! You can now close the browser manually if you wish.');
}
