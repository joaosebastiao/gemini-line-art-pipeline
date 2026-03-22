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

export async function runImageGeneration(imageCountArg, type = 'lineart', theme = '', loopIndex = null, promptTextOverride = null, refImageOverride = null) {
    const IMAGE_COUNT = imageCountArg !== undefined ? imageCountArg : 1;
    console.log(`Starting Gemini Headless Image Generator [Mode: ${type.toUpperCase()}] [Theme: ${theme || 'Default'}]...`);
    
    // Dynamic data scoping
    const safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
    const PROMPTS_FILE = type === 'lineart' ? './prompts.txt' : './draft_prompts.txt';
    const REFERENCES_DIR = type === 'lineart' ? './references' : './draft_references';
    const outputBase = type === 'draft' ? (safeTheme ? `./draft_downloads/${safeTheme}` : './draft_downloads') : (safeTheme ? `./line art/${safeTheme}` : './line art');
    const DOWNLOADS_DIR = path.resolve(outputBase);

    // Create uniquely isolated base id for this runtime natively perfectly eliminating race conditions
    const uniqueTaskId = crypto.randomBytes(6).toString('hex');

    // Ensure necessary directories and files exist
    if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    if (!fs.existsSync(REFERENCES_DIR)) fs.mkdirSync(REFERENCES_DIR, { recursive: true });
    if (!fs.existsSync(PROMPTS_FILE)) fs.writeFileSync(PROMPTS_FILE, '', 'utf-8');

    // Gather all reference images from the local payload folder or direct Auto Pilot override
    let referenceImages = [];
    if (refImageOverride) {
        const d_safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
        const draftsDir = d_safeTheme ? path.resolve('./draft_downloads', d_safeTheme) : path.resolve('./draft_downloads');
        const resolvedPath = path.resolve(draftsDir, refImageOverride);
        if (fs.existsSync(resolvedPath)) {
             referenceImages = [resolvedPath];
        } else {
             console.log(`[WARNING] Auto Pilot Reference Image override ${resolvedPath} not found!`);
        }
    } else {
        if (fs.existsSync(REFERENCES_DIR)) {
            referenceImages = fs.readdirSync(REFERENCES_DIR)
                .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i))
                .map(f => path.resolve(REFERENCES_DIR, f));
        }
    }
    
    let expectedDownloads = 0;
    // Read multi-line prompts separated by `---`
    let prompts = [];
    if (promptTextOverride) {
        prompts = promptTextOverride.includes('---') 
            ? promptTextOverride.split(/^---$/m).map(p => p.trim()).filter(p => p.length > 0)
            : [promptTextOverride.trim()];
    } else {
        try {
            const rawText = fs.readFileSync(PROMPTS_FILE, 'utf-8');
            // Handle both simple newlines (if no separator) and standard `---` separators
            prompts = rawText.includes('---') 
                ? rawText.split(/^---$/m).map(p => p.trim()).filter(p => p.length > 0)
                : [rawText.trim()]; // If no separator is found, treat the entire file as ONE single massive prompt
        } catch (err) {
            throw new Error(`Could not read ${PROMPTS_FILE}. Please make sure it exists.`);
        }
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
        
        try {
            const prefsPath = path.resolve(userDataPath, 'Default', 'Preferences');
            if (fs.existsSync(prefsPath)) {
                let data = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
                data.profile = data.profile || {};
                data.profile.default_content_setting_values = data.profile.default_content_setting_values || {};
                data.profile.default_content_setting_values.automatic_downloads = 1;
                fs.writeFileSync(prefsPath, JSON.stringify(data));
                console.log('Successfully injected automatic_downloads preference into Chrome profile natively prior to launch.');
            }
        } catch(err) {
            console.log('Warning: Could not natively inject automatic_downloads preference:', err.message);
        }
        
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
        
        const variationPromises = [];
        for (let variation = 0; variation < IMAGE_COUNT; variation++) {
            variationPromises.push((async () => {
            let page;
            let tabTempDownloadDir;
            try {
                console.log(`\n[${i + 1}/${prompts.length}] Processing prompt: "${prompt}" (Generation ${variation + 1}/${IMAGE_COUNT} concurrently)`);
            
            // Assign a truly isolated tab-specific temp download directory securely per concurrent generation
            tabTempDownloadDir = path.resolve(DOWNLOADS_DIR, `.temp_${Date.now()}_${uniqueTaskId}_var${variation}`);
            if (!fs.existsSync(tabTempDownloadDir)) fs.mkdirSync(tabTempDownloadDir, { recursive: true });
            
            // Check if the OS implicitly already holds the completed variation payload securely from a prior execution boundary natively
            if (loopIndex !== null) {
                const basePrefix = String(loopIndex);
                const possibleName = variation === 0 ? basePrefix : `${basePrefix}_var${variation}`;
                const existingFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(possibleName + '.'));
                if (existingFiles.length > 0) {
                    console.log(`[Cache Hit] Image heavily cached natively on OS payload (${existingFiles[0]}). Bypassing Google Gemini pings redundantly!`);
                    if (i === 0 && variation === 0) { try { await authPage.close(); } catch(e){} }
                    return; 
                }
            }
            
            // Reuse the auth tab for the first generation natively preventing visual reload glitch
            if (i === 0 && variation === 0) {
                page = authPage;
                const client = await page.target().createCDPSession();
                await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tabTempDownloadDir });
            } else {
                page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                const client = await page.target().createCDPSession();
                await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tabTempDownloadDir });
                await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });
            }
            
            // 1. Find the text input area
            const inputSelector = 'rich-textarea p, textarea, [contenteditable="true"]';
            await page.waitForSelector(inputSelector, { visible: true });
            
            // Give Gemini's heavy javascript interface an extra second to completely finish rendering
            await sleep(1500); 

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
                return;
            }

            console.log('Prompt successfully submitted. Waiting a mandatory 40 seconds for the heavy base rendering to complete natively...');
            await sleep(40000);
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

            // 5. Download the images directly without clicking the download buttons
            console.log('Images generated! Extracting image data directly without clicking...');

            if (type === 'draft') {
                const imageUrls = await page.evaluate(async (refCount) => {
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        for (const el of root.querySelectorAll('*')) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                    
                    const allImages = findAllShadow('img[src*="googleusercontent.com/gg-dl/"], img.image, img[alt*="AI generated"]');
                    const untaggedImages = allImages.filter(img => 
                        !img.dataset.downloaded && 
                        (typeof img.className === 'string' && !img.className.includes('user-icon'))
                    );

                    const urls = [];
                    for (const img of untaggedImages) {
                        urls.push(img.src);
                        img.dataset.downloaded = 'true';
                    }
                    return urls;
                }, referenceImages.length);

                console.log(`Successfully extracted ${imageUrls.length} draft image URLs. Processing buffer payloads directly...`);

                // Use the precise direct URL fetching method for Drafts
                for (let j = 0; j < imageUrls.length; j++) {
                    const ext = '.jpg';
                    const defaultPrefix = 'gemini_draft';
                    let basePrefix = loopIndex !== null && loopIndex !== undefined ? String(loopIndex) : `${defaultPrefix}_${Date.now()}`;
                    let suffix = j;
                    let writePath;
                    while(true) {
                        const name = suffix === 0 ? `${basePrefix}${ext}` : `${basePrefix}_var${suffix}${ext}`;
                        writePath = path.join(DOWNLOADS_DIR, name);
                        if (!fs.existsSync(writePath)) break;
                        suffix++;
                    }

                    try {
                        console.log(`Downloading Draft URL inherently securely: ${imageUrls[j]}`);
                        await downloadImage(page, imageUrls[j], writePath);
                        if (fs.existsSync(writePath)) {
                            expectedDownloads++;
                            console.log(`Successfully extracted dynamically without clicking into: ${writePath}`);
                        }
                    } catch(err) {
                        console.error('Failed to download image seamlessly natively', err);
                    }
                }
            } else {
                // Line Art natively clicks to trigger Google's upscaler explicitly!
                const expectedNewDownloads = await page.evaluate(async (refCount) => {
                    const sleep = ms => new Promise(r => setTimeout(r, ms));
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        for (const el of root.querySelectorAll('*')) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                    
                    const allImages = findAllShadow('img[src*="googleusercontent.com/gg-dl/"], img.image, img[alt*="AI generated"]');
                    const untaggedImages = allImages.filter(img => 
                        !img.dataset.downloaded && 
                        (typeof img.className === 'string' && !img.className.includes('user-icon'))
                    );

                    let clicks = 0;
                    for (let img of untaggedImages) {
                        try { img.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(err){}
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
                            curr = curr.parentElement || (curr.getRootNode ? curr.getRootNode().host : null);
                        }

                        if (foundDirectBtn) {
                            foundDirectBtn.click();
                            img.dataset.downloaded = 'true';
                            clicks++;
                            await sleep(500);
                        } else {
                            // Fallback if visual button fails to manifest
                            img.click();
                        }
                    }
                    return clicks;
                }, referenceImages.length);

                console.log(`Successfully dispatched ${expectedNewDownloads} line art download clicks explicitly upscaling!`);

                // Wait for downloading
                for (let w = 0; w < 30; w++) {
                    if (!fs.existsSync(tabTempDownloadDir)) break;
                    const files = fs.readdirSync(tabTempDownloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f.match(/\.(jpe?g|png|gif|webp)$/i));
                    if (files.length >= expectedNewDownloads && expectedNewDownloads > 0) break;
                    await sleep(1000);
                }

                if (fs.existsSync(tabTempDownloadDir) && expectedNewDownloads > 0) {
                    const downloadedFiles = fs.readdirSync(tabTempDownloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f.match(/\.(jpe?g|png|gif|webp)$/i));
                    for (let j = 0; j < downloadedFiles.length; j++) {
                        const file = downloadedFiles[j];
                        const filePath = path.join(tabTempDownloadDir, file);
                        const ext = path.extname(file) || '.jpg';
                        
                        const defaultPrefix = 'gemini_gen';
                        let basePrefix = loopIndex !== null && loopIndex !== undefined ? String(loopIndex) : `${defaultPrefix}_${Date.now()}`;
                        let suffix = j;
                        let writePath;
                        while(true) {
                            const name = suffix === 0 ? `${basePrefix}${ext}` : `${basePrefix}_var${suffix}${ext}`;
                            writePath = path.join(DOWNLOADS_DIR, name);
                            if (!fs.existsSync(writePath)) break;
                            suffix++;
                        }
                        
                        try {
                            fs.copyFileSync(filePath, writePath);
                            fs.unlinkSync(filePath);
                            expectedDownloads++;
                        } catch(e) {
                            console.error(`Failed to move file ${filePath}`, e);
                        }
                    }
                }
            }

            if (expectedDownloads === 0) {
                throw new Error("Zero draft images securely isolated natively!");
            }
            
            try { await page.close(); } catch (e) {}
            // Clean up tab-specific temp natively
            try { fs.rmSync(tabTempDownloadDir, { recursive: true, force: true }); } catch (err) {}
            } catch (err) {
                console.error(`\n❌ [ERROR] Fatal failure during Prompt ${i + 1}, Variation ${variation + 1}:`);
                console.error(err);
                console.log(`Skipping to next iteration to ensure overnight batch continues cleanly.`);
                if (page && page !== authPage) {
                    try { await page.close(); } catch (e) {}
                }
                // Also clean up explicitly on error
                if (tabTempDownloadDir) try { fs.rmSync(tabTempDownloadDir, { recursive: true, force: true }); } catch (err) {}
            }
            })());
            // Stagger tabs natively by 1.5s
            await sleep(1500);
        }
        await Promise.all(variationPromises);
        // Small delay before the next prompt
        await sleep(2000);
    }

    console.log('\nAll prompts processed! Cleanly finished extraction.');
    // Clean up purely isolated native temp directory identically preserving system integrity natively
    console.log('\nProcess totally complete! You can now close the browser manually if you wish.');
}
