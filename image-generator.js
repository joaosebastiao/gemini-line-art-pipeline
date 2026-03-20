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

export async function runImageGeneration(imageCountArg, type = 'lineart', theme = '') {
    const IMAGE_COUNT = imageCountArg !== undefined ? imageCountArg : 1;
    console.log(`Starting Gemini Headless Image Generator [Mode: ${type.toUpperCase()}] [Theme: ${theme || 'Default'}]...`);
    
    // Dynamic data scoping
    const safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
    const PROMPTS_FILE = type === 'lineart' ? './prompts.txt' : './draft_prompts.txt';
    const REFERENCES_DIR = type === 'lineart' ? './references' : './draft_references';
    const outputBase = type === 'draft' ? './draft_downloads' : (safeTheme ? `./line art/${safeTheme}` : './line art');
    const DOWNLOADS_DIR = path.resolve(outputBase);

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
    const scriptStartTime = Date.now() - 5000; // 5 seconds buffer
    let expectedDownloads = 0;
    let completedDownloads = 0;
    
    // Background watcher that runs independently
    const watchDownloads = async () => {
        const userDownloads = path.join(os.homedir(), 'Downloads');
        while (true) {
            try {
                const files = fs.readdirSync(userDownloads);
                for (const file of files) {
                    if (file.endsWith('.crdownload') || file.endsWith('.tmp') || !file.match(/\.(jpe?g|png|gif|webp)$/i)) continue;
                    
                    // Ignore personal files - only scoop Gemini images downloaded by the script
                    if (!file.toLowerCase().startsWith('gemini_generated_image')) continue;
                    
                    const filePath = path.join(userDownloads, file);
                    const stat = fs.statSync(filePath);
                    
                    // If it's a newly generated/modified image
                    if (stat.birthtimeMs > scriptStartTime || stat.mtimeMs > scriptStartTime) {
                        await sleep(500); // Wait briefly to avoid filesystem locks
                        const newPath = path.join(DOWNLOADS_DIR, file);
                        try {
                            fs.copyFileSync(filePath, newPath);
                            fs.unlinkSync(filePath);
                            completedDownloads++;
                            console.log(`\n✅ [Background] Retrieved ${file}! (${completedDownloads}/${expectedDownloads} finished)\n`);
                        } catch (moveErr) {
                            // File likely locked by Chrome, will try again next loop
                        }
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
                
                // Immediately sweep the auth tab since we've verified the session is alive
                try { await authPage.close(); } catch (e) {}
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
            console.log(`\n[${i + 1}/${prompts.length}] Processing prompt: "${prompt}" (Generation ${variation + 1}/${IMAGE_COUNT})`);
            
            // Open a fresh tab for EACH variation
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });
            
            // 1. Find the text input area
            const inputSelector = 'rich-textarea p, textarea, [contenteditable="true"]';
            await page.waitForSelector(inputSelector, { visible: true });
            
            // Give Gemini's heavy javascript interface an extra second to completely finish rendering
            await sleep(1500); 
            
            // Proactively tag any existing images in the tab (if any history loaded) so we don't accidentally download them
            await page.evaluate(() => {
                document.querySelectorAll('img[src*="googleusercontent.com"], img[src^="blob:"]').forEach(img => img.dataset.downloaded = 'true');
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
            }, `Generate an image of: ${p}`, inputSelector);
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
                console.log('Images pasted. Actively polling the Enter key until Google finishes processing them...');
            }
            
            let enterClicks = 0;
            // Poll for up to 60 seconds (approx 45 tries at 1.5s intervals)
            for (let tries = 0; tries < 45; tries++) {
                await page.keyboard.press('Enter');
                enterClicks++;
                
                if (enterClicks === 1 && referenceImages.length === 0) {
                    console.log('Pressed Enter. Waiting to see if generation sustains...');
                }
                
                await sleep(1500);
                
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
                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                continue;
            }

            console.log('Generation stabilized! Waiting for it to finish naturally...');

            // 4. Wait for generation to completely finish
            let lastHTML = '';
            let stableCount = 0;
            while (true) {
                await sleep(2000);
                let currentHTML = lastHTML;
                try {
                    currentHTML = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
                } catch (err) {}
                if (currentHTML === lastHTML) {
                    stableCount++;
                    if (stableCount >= 4) {
                        console.log('Generation is complete! Finding download buttons...');
                        break;
                    }
                } else {
                    lastHTML = currentHTML;
                    stableCount = 0;
                }
            }

            // 5. Download the images by opening the Lightbox / Gallery
            console.log('Images generated! Triggering native downloads...');
            
            const clickedCount = await page.evaluate(async (refCount) => {
                const sleep = ms => new Promise(r => setTimeout(r, ms));
                let clicks = 0;
                
                const allImages = Array.from(document.querySelectorAll('img[src*="googleusercontent.com"], img[src^="blob:"]'));
                let untaggedImages = allImages.filter(img => !img.dataset.downloaded);
                
                // Mathematically ignore reference images: Since this is a completely fresh tab perfectly isolated,
                // the new untagged images will exactly sequence as: [Reference Payload] -> [Gemini Generation].
                if (refCount > 0) {
                    untaggedImages = untaggedImages.slice(refCount);
                }
                
                for (let i = 0; i < untaggedImages.length; i++) {
                    const img = untaggedImages[i];
                    img.dataset.downloaded = 'true';
                    
                    // Fix for "below the fold" issues: scroll the image into the center of the screen
                    img.scrollIntoView({ behavior: 'instant', block: 'center' });
                    await sleep(500); // Wait for potential lazy-loads instantly triggered by scrolling
                    
                    let curr = img.parentElement;
                    let foundDirectBtn = null;
                    for (let lvl = 0; lvl < 6; lvl++) {
                        if (!curr) break;
                        const icon = curr.querySelector('mat-icon[data-mat-icon-name="download"]');
                        if (icon) {
                            foundDirectBtn = icon.closest('button') || icon;
                            break;
                        }
                        curr = curr.parentElement;
                    }
                    
                    if (foundDirectBtn) {
                        foundDirectBtn.click();
                        clicks++;
                        await sleep(500);
                    } else {
                        img.click();
                        if (img.parentElement) img.parentElement.click();
                        await sleep(2000); 
                        
                        const dlIcons = Array.from(document.querySelectorAll('mat-icon[data-mat-icon-name="download"]'));
                        if (dlIcons.length > 0) {
                            const targetIcon = dlIcons[dlIcons.length - 1];
                            const dlButton = targetIcon.closest('button') || targetIcon;
                            dlButton.click();
                            clicks++;
                            await sleep(500);
                        }
                        
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                        await sleep(1000);
                    }
                }
                return clicks;
            }, referenceImages.length);
            
            expectedDownloads += clickedCount;
            console.log(`Triggered ${clickedCount} downloads! Continuing...`);

            // Before moving to the next variation or prompt, wait for all downloads to finish from THIS tab
            if (expectedDownloads > completedDownloads) {
                console.log(`Waiting for ${expectedDownloads - completedDownloads} background downloads to finish before safely closing tab...`);
                let timeoutCounter = 0;
                while (completedDownloads < expectedDownloads && timeoutCounter < 180) {
                    await sleep(1000);
                    timeoutCounter++;
                }
            }
            
            console.log('All image retrievals complete! Sweeping up the tab...');
            try { await page.close(); } catch (e) {}

            // Small delay before the next variation tab
            await sleep(2000);
        }
    }

    console.log(`\nAll prompts processed! Triggered a total of ${expectedDownloads} downloads.`);
    
    console.log('\nProcess totally complete! You can now close the browser manually if you wish.');
}
