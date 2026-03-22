import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const USER_DATA_DIR = './user_data';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function runVisionPromptGeneration(selectedImages, promptText, overwrite = false, theme = '') {
    console.log(`Starting Vision Prompt Generation Flow... [Overwrite: ${overwrite}]`);

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
    } catch (e) {
        console.log('Chrome is not running. Auto-launching it now...');
        const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        const userDataPath = path.resolve(USER_DATA_DIR);
        const chromeProcess = spawn(chromeExe, ['--remote-debugging-port=9222', `--user-data-dir=${userDataPath}`], { detached: true, stdio: 'ignore' });
        chromeProcess.unref(); 
        await sleep(4000);
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
    }

    const targetPhrase = "Generate an illustration in exactly the same art style as the reference illustrations";
    let attempt = 1;
    
    while(true) {
        console.log(`\n--- Vision Prompt Generation Attempt ${attempt} ---`);
        const page = await browser.newPage();
        console.log('Navigating to Gemini...');
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });

    const inputSelector = 'rich-textarea p, textarea, [contenteditable="true"]';
    await page.waitForSelector(inputSelector, { timeout: 15000, visible: true });
    await sleep(2000);

    console.log('Clearing input...');
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
        }
    }, inputSelector);
    await sleep(500);

    // Paste Draft Images
    if (selectedImages && selectedImages.length > 0) {
        console.log(`Pasting ${selectedImages.length} draft images...`);
        const safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
        const DRAFTS_DIR = safeTheme ? path.resolve('./draft_downloads', safeTheme) : path.resolve('./draft_downloads');
        const imagesAsBase64 = selectedImages.map(imgName => {
            const resolvedPath = path.resolve(DRAFTS_DIR, imgName);
            const ext = path.extname(resolvedPath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            const data = fs.readFileSync(resolvedPath).toString('base64');
            return { mimeType, data, name: path.basename(resolvedPath) };
        });

        await page.evaluate(async (imgs, sel) => {
            const el = document.querySelector(sel);
            for (const img of imgs) {
                const res = await fetch(`data:${img.mimeType};base64,${img.data}`);
                const blob = await res.blob();
                const file = new File([blob], img.name, { type: img.mimeType });
                const dt = new DataTransfer();
                dt.items.add(file);
                const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
                el.dispatchEvent(pasteEvent);
                await new Promise(r => setTimeout(r, 800));
            }
        }, imagesAsBase64, inputSelector);
        
        console.log('Draft images placed. Waiting exactly 5.5 seconds for Gemini to register the visual buffers natively...');
        await sleep(5500);
    }

    // Insert Text
    console.log('Injecting textual vision prompt request...');
    await page.evaluate((text, sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.focus();
            document.execCommand('insertText', false, text);
        }
    }, promptText, inputSelector);
    await sleep(1000);

    console.log('Capturing state before generation...');
    let previousLastMessageText = null;
    try {
        const shadowTexts = await page.$$eval('pierce/message-content', els => els.map(e => e.textContent.trim()));
        if (shadowTexts && shadowTexts.length > 0) {
            previousLastMessageText = shadowTexts[shadowTexts.length - 1];
        }
    } catch(e) {}
    
    if (!previousLastMessageText) {
        previousLastMessageText = await page.evaluate(() => {
            const selectors = ['model-message', 'message-content', '[data-message-author="role_model"]', '.model-response-text', '.message-content', 'response-body', '#chat-history .response-container', '.query-response'];
            let foundElements = [];
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) {
                    foundElements = Array.from(els);
                    break;
                }
            }
            if (foundElements.length === 0) return '';
            const lastMessage = foundElements[foundElements.length - 1];
            const contentBlock = lastMessage.querySelector('message-content') || lastMessage;
            return (contentBlock.innerText || contentBlock.textContent || '').trim();
        });
    }

    // Submit payload
    let submitted = false;
    for (let tries = 0; tries < 20; tries++) {
        await page.focus(inputSelector);
        await page.keyboard.press('Enter');
        await sleep(2000);
        const postSubmitVal = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? (el.value || el.innerText || '').trim() : '';
        }, inputSelector);
        
        if (postSubmitVal.length < 5) {
            submitted = true;
            console.log('Vision payload successfully submitted!');
            break;
        }
    }
    
    if (!submitted) throw new Error("Failed to submit multimodal payload! Gemini dropped it.");

    console.log('Waiting for response...');
    let lastHTML = '';
    let stableCount = 0;
    let totalWaitTime = 0;
    const maxWaitTime = 300000; // 5 minutes max wait
    
    while (totalWaitTime < maxWaitTime) {
        await sleep(2000);
        totalWaitTime += 2000;
        let currentHTML = lastHTML;
        try { currentHTML = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0); } catch (err) {}
        if (currentHTML === lastHTML) {
            stableCount++;
            if (stableCount >= 4) {
                let currentLastMessageText = null;
                try {
                    const shadowTexts = await page.$$eval('pierce/message-content', els => els.map(e => e.textContent.trim()));
                    if (shadowTexts && shadowTexts.length > 0) currentLastMessageText = shadowTexts[shadowTexts.length - 1];
                } catch(e) {}
                
                if (!currentLastMessageText) {
                    currentLastMessageText = await page.evaluate(() => {
                        const selectors = ['model-message', 'message-content', '[data-message-author="role_model"]', '.model-response-text', '.message-content', 'response-body', '#chat-history .response-container', '.query-response'];
                        let foundElements = [];
                        for (const sel of selectors) {
                            const els = document.querySelectorAll(sel);
                            if (els.length > 0) { foundElements = Array.from(els); break; }
                        }
                        if (foundElements.length === 0) return '';
                        const lastMessage = foundElements[foundElements.length - 1];
                        const contentBlock = lastMessage.querySelector('message-content') || lastMessage;
                        return (contentBlock.innerText || contentBlock.textContent || '').trim();
                    });
                }
                
                if (currentLastMessageText && currentLastMessageText !== previousLastMessageText) {
                    console.log('Response generation is totally complete!');
                    break;
                } else {
                    console.log(`DOM is stable, but waiting for new response... (${totalWaitTime/1000}s)`);
                }
            }
        } else {
            lastHTML = currentHTML;
            stableCount = 0;
        }
    }

    // Extract DOM natively
    let extractedText = null;
    try {
        const shadowTexts = await page.$$eval('pierce/message-content', els => els.map(e => e.textContent.trim()));
        if (shadowTexts && shadowTexts.length > 0) extractedText = shadowTexts[shadowTexts.length - 1];
    } catch(e) {}
    
    if (!extractedText) {
        extractedText = await page.evaluate(() => {
            const selectors = ['model-message', 'message-content', '[data-message-author="role_model"]', '.model-response-text', '.message-content', 'response-body', '#chat-history .response-container', '.query-response'];
            let foundElements = [];
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) { foundElements = Array.from(els); break; }
            }
            if (foundElements.length === 0) return null;
            
            const lastMessage = foundElements[foundElements.length - 1];
            const contentBlock = lastMessage.querySelector('message-content') || lastMessage;
            return contentBlock.innerText || contentBlock.textContent;
        });
    }

    if (!extractedText) throw new Error("Could not scrape Gemini response!");

    let finalWriteText = extractedText.trim();
    finalWriteText = finalWriteText.replace(/^plaintext/i, '');
    finalWriteText = finalWriteText.replace(/^html/i, '');
    finalWriteText = finalWriteText.trim();
    
        if (finalWriteText.includes(targetPhrase)) {
            console.log('✅ Generated prompt includes the required art style phrase.');
            
            // Append to Line Art prompts.txt natively
            const promptsFile = path.resolve('./prompts.txt');
            if (overwrite) {
                fs.writeFileSync(promptsFile, finalWriteText);
            } else {
                try {
                    const existing = fs.readFileSync(promptsFile, 'utf-8');
                    fs.writeFileSync(promptsFile, existing + (existing.trim().length > 0 ? '\n\n---\n\n' : '') + finalWriteText);
                } catch(e) {
                    fs.writeFileSync(promptsFile, finalWriteText);
                }
            }
        
            try { await page.close(); } catch(e){}
            return finalWriteText;
        } else {
            console.log('❌ Generated prompt is missing the required phrase. Retrying...');
            try { await page.close(); } catch(e){}
            attempt++;
        }
    }
}
