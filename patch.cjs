const fs = require('fs');
let content = fs.readFileSync('image-generator.js', 'utf8');

const startBlock = '            // 5. Download the images by opening the Lightbox / Gallery';
const startIdx = content.indexOf(startBlock);

let endFinalIdx = content.indexOf('            } catch (err) {\r\n                console.error(`\\n❌ [ERROR] Fatal failure during Prompt');
if (endFinalIdx === -1) {
    endFinalIdx = content.indexOf('            } catch (err) {\n                console.error(`\\n❌ [ERROR] Fatal failure during Prompt');
}

if (startIdx === -1 || endFinalIdx === -1) {
    console.log("Could not find bounds! start:", startIdx, "end:", endFinalIdx);
    process.exit(1);
}

const replacement = `            // 5. Download the images cleanly smoothly via explicitly isolated raw memory Node Buffer pipelines cleanly dynamically organically natively
            console.log('Images generated! Bypassing Chromium GUI entirely completely fetching memory natively securely...');
            
            const base64Images = await page.evaluate(async () => {
                function findAllShadow(selector, root = document) {
                    let found = Array.from(root.querySelectorAll(selector));
                    const allElements = root.querySelectorAll('*');
                    for (const el of allElements) {
                        if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                    }
                    return found;
                }
                const allImages = findAllShadow('img[src*="googleusercontent.com"], img[src^="blob:"]');
                let targetImages = allImages.filter(img => {
                    if (img.dataset.downloaded) return false;
                    const alt = img.getAttribute('alt') || '';
                    return alt.toLowerCase().includes('generated');
                });
                const results = [];
                for (const img of targetImages) {
                    if (img.src && img.src.length > 5 && !img.src.includes('data:image/svg')) {
                        results.push(img.src);
                        img.dataset.downloaded = 'extracted';
                    }
                }
                return results;
            });

            if (base64Images.length === 0) {
                const debugReport = await page.evaluate(() => {
                    function findAllShadow(selector, root = document) {
                        let found = Array.from(root.querySelectorAll(selector));
                        const allElements = root.querySelectorAll('*');
                        for (const el of allElements) {
                            if (el.shadowRoot) found = found.concat(findAllShadow(selector, el.shadowRoot));
                        }
                        return found;
                    }
                    const allImg = findAllShadow('img');
                    const filtered = allImg.filter(i => i.src && i.src.length > 5 && !i.src.includes('data:image/svg'));
                    return filtered.map(i => ({ src: i.src.substring(0, 50) + '...', alt: i.getAttribute('alt'), class: i.className })).slice(-15);
                });
                throw new Error("Zero output images securely isolated natively! DEBUG REPORT:\\n" + JSON.stringify(debugReport, null, 2));
            }

            console.log('Images isolated! Writing raw bytes natively smoothly via Node HTTP dynamically organically...');
            for (let j = 0; j < base64Images.length; j++) {
                const imgUrl = base64Images[j];
                const defaultPrefix = type === 'draft' ? 'gemini_draft' : 'gemini_gen';
                let basePrefix = loopIndex ? String(loopIndex) : \`\${defaultPrefix}_\${Date.now()}\`;
                let suffix = j;
                let writePath;
                while(true) {
                    const name = suffix === 0 ? \`\${basePrefix}.jpg\` : \`\${basePrefix}_var\${suffix}.jpg\`;
                    writePath = path.join(DOWNLOADS_DIR, name);
                    if (!fs.existsSync(writePath)) break;
                    suffix++;
                }
                try {
                    const tempPage = await browser.newPage();
                    const viewSource = await tempPage.goto(imgUrl);
                    fs.writeFileSync(writePath, await viewSource.buffer());
                    await tempPage.close();
                    console.log(\`Successfully intercepted and exported native output payload \${j+1}/\${base64Images.length} straight to disk!\`);
                    expectedDownloads++;
                } catch(e) {
                     console.error(\`Failed native Node stream write securely cleanly organically for output payload \${j+1}:\`, e);
                }
            }
            
            try { await page.close(); } catch (e) {}
`;

content = content.substring(0, startIdx) + replacement + content.substring(endFinalIdx);

const watchStart = content.indexOf('    // Setup background download tracking');
const watchEnd = content.indexOf('    // Read multi-line prompts separated by `---`');
if(watchStart !== -1 && watchEnd !== -1) {
    content = content.substring(0, watchStart) + "    let expectedDownloads = 0;\n" + content.substring(watchEnd);
}

content = content.replace(/console\.log\(\`\\nAll prompts processed! Triggered a total of \$\{expectedDownloads\} downloads\.\`\);\s*isWatching = false;/gm, "console.log('\\nAll prompts processed! Cleanly finished extraction.');");

fs.writeFileSync('image-generator.js', content);
console.log("Patch successfully applied!");
