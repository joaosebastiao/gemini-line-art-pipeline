import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const USER_DATA_DIR = './user_data';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function runVisionPromptGeneration(selectedImages, promptText, overwrite = false) {
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
        const DRAFTS_DIR = path.resolve('./draft_downloads');
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
        
        await sleep(1000);
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

    // Submit payload
    let submitted = false;
    for (let tries = 0; tries < 20; tries++) {
        await page.keyboard.press('Enter');
        await sleep(1500);
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
    while (true) {
        await sleep(2000);
        let currentHTML = lastHTML;
        try { currentHTML = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0); } catch (err) {}
        if (currentHTML === lastHTML) {
            stableCount++;
            if (stableCount >= 4) break;
        } else {
            lastHTML = currentHTML;
            stableCount = 0;
        }
    }

    // Extract DOM natively
    const extractedText = await page.evaluate(() => {
        const selectors = ['model-message', 'message-content', '[data-message-author="role_model"]', '.model-response-text', '.message-content', 'response-body', '#chat-history .response-container', '.query-response'];
        let foundElements = [];
        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                foundElements = Array.from(els);
                break;
            }
        }
        if (foundElements.length === 0) return null;
        
        const lastMessage = foundElements[foundElements.length - 1];
        const contentBlock = lastMessage.querySelector('message-content') || lastMessage;
        return contentBlock.innerText || contentBlock.textContent;
    });

    if (!extractedText) throw new Error("Could not scrape Gemini response!");

    const finalWriteText = extractedText.trim();
    
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
}
