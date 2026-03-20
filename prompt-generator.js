import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const USER_DATA_DIR = './user_data';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function runPromptGeneration(promptText, title, draftTemplate, theme, maxIdeas = 0) {
    console.log(`Starting Prompt Generation Flow... (Title: ${title})`);

    // Connect to existing browser or launch it automatically
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        console.log('Connected to running Chrome for Prompt Gen!');
    } catch (e) {
        console.log('Chrome is not running. Auto-launching it now...');
        const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        const userDataPath = path.resolve(USER_DATA_DIR);
        
        const chromeProcess = spawn(chromeExe, [
            '--remote-debugging-port=9222',
            `--user-data-dir=${userDataPath}`
        ], { detached: true, stdio: 'ignore' });
        chromeProcess.unref(); 
        
        await sleep(4000);
        
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: { width: 1280, height: 800 }
            });
            console.log('Successfully connected to auto-launched Chrome!');
        } catch (err) {
            throw new Error('ERROR: Could not connect to Chrome automatically.');
        }
    }

    const page = await browser.newPage();

    console.log('Navigating to Gemini...');
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });

    console.log('Waiting for chat interface...');
    const inputSelector = 'rich-textarea p, textarea, [contenteditable="true"]';
    await page.waitForSelector(inputSelector, { timeout: 15000, visible: true });
    
    await sleep(2000); // Give JS time to stabilize
    
    console.log('Submitting textual prompt...');
    
    // Clear and Paste prompt
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
        }
    }, inputSelector);
    await sleep(500);

    await page.evaluate((text, sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.focus();
            document.execCommand('insertText', false, text);
        }
    }, promptText, inputSelector);
    await sleep(1000);

    // Submit with active polling
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
            console.log('Prompt successfully submitted!');
            break;
        }
    }
    
    if (!submitted) {
        throw new Error("Failed to submit the prompt to Gemini! The chat box never cleared.");
    }
    
    console.log('Waiting for response generation to stabilize...');

    // Wait for text generation to finish by monitoring document.body length
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
                console.log('Response generation is totally complete!');
                break;
            }
        } else {
            lastHTML = currentHTML;
            stableCount = 0;
        }
    }

    // Extract the text of the latest model response block
    console.log('Extracting text from the browser natively...');
    
    const extractedText = await page.evaluate(() => {
        // Broaden the target selectors for Gemini's highly dynamic DOM
        const selectors = [
            'model-message', 
            'message-content', 
            '[data-message-author="role_model"]',
            '.model-response-text',
            '.message-content',
            'response-body',
            '#chat-history .response-container',
            '.query-response'
        ];
        
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
    
    if (!extractedText) {
        throw new Error("Could not find Gemini's response text in the DOM!");
    }

    // Clean extracted block
    const safeText = extractedText.trim();
    
    // Phase 2: Intercept the text, slice it into concepts, and wrap them strictly in blueprint payloads
    let finalWriteText = safeText;
    if (draftTemplate && theme) {
        const cleanText = safeText.replace(/\*/g, ''); // Sweep asterisks Gemini adds around text sometimes
        let ideas = cleanText.split('---').map(s => s.trim()).filter(s => s.length > 5);
        if (maxIdeas > 0) ideas = ideas.slice(0, maxIdeas);
        
        const blocks = ideas.map(idea => {
            return draftTemplate
                .replace(/{theme}/gi, theme)
                .replace(/{idea}/gi, idea);
        });
        
        finalWriteText = blocks.join('\n\n---\n\n');
    } else if (maxIdeas > 0) {
        const cleanText = safeText.replace(/\*/g, '');
        let ideas = cleanText.split('---').map(s => s.trim()).filter(s => s.length > 5);
        finalWriteText = ideas.slice(0, maxIdeas).join('\n\n---\n\n');
    }

    const outputDir = path.resolve('./generated_prompts');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Sanitize the title and define path
    const safeTitle = (title || 'untitled').replace(/[^a-z0-9 ]/gi, '_').trim();
    let savePath = path.resolve(outputDir, `${safeTitle}.txt`);
    let counter = 1;
    
    // Archival Backup: If the file already exists, automatically append a number to the suffix
    while (fs.existsSync(savePath)) {
        savePath = path.resolve(outputDir, `${safeTitle}_${counter}.txt`);
        counter++;
    }
    
    // Write out the strictly unique archival file
    fs.writeFileSync(savePath, finalWriteText);
    
    // OVERWRITE draft_prompts.txt locally to instantly feed the Draft Generator tab
    const draftTarget = path.resolve('./draft_prompts.txt');
    fs.writeFileSync(draftTarget, finalWriteText);

    // Sweep up
    console.log('Extracted and Wrapped securely! Sweeping up tab...');
    try { await page.close(); } catch(e){}
    
    return finalWriteText;
}
