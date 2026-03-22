document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            if (btn.dataset.tab === 'vision') renderVisionGallery();
        });
    });

    // Simple Helper for Logs
    function appendLog(elementId, message) {
        const logWindow = document.getElementById(elementId);
        if (logWindow.innerText === 'Ready.' || logWindow.innerText === 'Ready. Fill out the variables above.') {
            logWindow.innerText = '';
        }
        logWindow.innerText += message + '\n\n';
        logWindow.scrollTop = logWindow.scrollHeight;
    }

    // Prompts File Editor Logic
    const promptsEditor = document.getElementById('prompts-editor');
    const savePromptsBtn = document.getElementById('save-prompts-btn');
    const saveStatus = document.getElementById('save-status');

    if (promptsEditor && savePromptsBtn) {
        // Load initial content
        fetch('http://localhost:3000/api/prompts-file')
            .then(res => res.json())
            .then(data => {
                if (data.content !== undefined) promptsEditor.value = data.content;
            })
            .catch(err => console.error('Failed to load prompts text:', err));

        savePromptsBtn.addEventListener('click', async () => {
            savePromptsBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/prompts-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: promptsEditor.value })
                });
                saveStatus.style.display = 'inline';
                setTimeout(() => saveStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save:', err);
            }
            savePromptsBtn.innerText = '💾 Save Prompts File';
        });
    }

    // Base Prompt Template Editor Logic
    const basePromptEditor = document.getElementById('base-prompt');
    const saveBaseBtn = document.getElementById('save-base-btn');
    const saveBaseStatus = document.getElementById('save-base-status');

    if (basePromptEditor && saveBaseBtn) {
        fetch('http://localhost:3000/api/base-prompt-file')
            .then(res => res.json())
            .then(data => {
                if (data.content !== undefined) basePromptEditor.value = data.content;
            })
            .catch(err => console.error('Failed to load base prompt text:', err));

        saveBaseBtn.addEventListener('click', async () => {
            saveBaseBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/base-prompt-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: basePromptEditor.value })
                });
                saveBaseStatus.style.display = 'inline';
                setTimeout(() => saveBaseStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save:', err);
            }
            saveBaseBtn.innerText = '💾 Save Stage 1 Template';
        });
    }

    // Wrapper Prompt Template Editor Logic
    const wrapperPromptEditor = document.getElementById('draft-wrapper-prompt');
    const saveWrapperBtn = document.getElementById('save-wrapper-btn');
    const saveWrapperStatus = document.getElementById('save-wrapper-status');

    if (wrapperPromptEditor && saveWrapperBtn) {
        fetch('http://localhost:3000/api/wrapper-prompt-file')
            .then(res => res.json())
            .then(data => {
                if (data.content !== undefined) wrapperPromptEditor.value = data.content;
            })
            .catch(err => console.error('Failed to load wrapper prompt text:', err));

        saveWrapperBtn.addEventListener('click', async () => {
            saveWrapperBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/wrapper-prompt-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: wrapperPromptEditor.value })
                });
                saveWrapperStatus.style.display = 'inline';
                setTimeout(() => saveWrapperStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save:', err);
            }
            saveWrapperBtn.innerText = '💾 Save Stage 2 Template';
        });
    }
    
    // Vision Prompt Template Editor Logic
    const visionPromptEditor = document.getElementById('vision-prompt-text');
    const saveVisionBtn = document.getElementById('save-vision-btn');
    const saveVisionStatus = document.getElementById('save-vision-status');

    if (visionPromptEditor && saveVisionBtn) {
        fetch('http://localhost:3000/api/vision-prompt-file')
            .then(res => res.json())
            .then(data => {
                if (data.content !== undefined) visionPromptEditor.value = data.content;
            })
            .catch(err => console.error('Failed to load vision prompt text:', err));

        saveVisionBtn.addEventListener('click', async () => {
            saveVisionBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/vision-prompt-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: visionPromptEditor.value })
                });
                saveVisionStatus.style.display = 'inline';
                setTimeout(() => saveVisionStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save:', err);
            }
            saveVisionBtn.innerText = '💾 Save Vision Instructions Array';
        });
    }

    // Character Storage Logic
    const characterInput = document.getElementById('character');
    const saveCharBtn = document.getElementById('save-character-btn');
    const saveCharStatus = document.getElementById('save-character-status');
    
    if (characterInput && saveCharBtn) {
        fetch('http://localhost:3000/api/character-file')
            .then(res => res.json())
            .then(data => { if (data.content !== undefined && data.content.trim() !== '') characterInput.value = data.content; })
            .catch(err => console.error('Failed to load character text:', err));

        saveCharBtn.addEventListener('click', async () => {
            saveCharBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/character-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: characterInput.value })
                });
                saveCharStatus.style.display = 'inline';
                setTimeout(() => saveCharStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save character:', err);
            }
            saveCharBtn.innerText = '💾 Save Character';
        });
    }

    // Vision Character Storage Logic
    const visionCharInput = document.getElementById('vision-character');
    const saveVisionCharBtn = document.getElementById('save-vision-char-btn');
    const saveVisionCharStatus = document.getElementById('save-vision-char-status');
    const autoVisionCharInput = document.getElementById('auto-vision-character');
    
    if (visionCharInput && saveVisionCharBtn) {
        fetch('http://localhost:3000/api/vision-character-file')
            .then(res => res.json())
            .then(data => { 
                if (data.content !== undefined && data.content.trim() !== '') {
                    visionCharInput.value = data.content;
                    if (autoVisionCharInput) autoVisionCharInput.value = data.content;
                }
            })
            .catch(err => console.error('Failed to load vision character text:', err));

        saveVisionCharBtn.addEventListener('click', async () => {
            saveVisionCharBtn.innerText = 'Saving...';
            try {
                await fetch('http://localhost:3000/api/vision-character-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: visionCharInput.value })
                });
                if (autoVisionCharInput) autoVisionCharInput.value = visionCharInput.value;
                saveVisionCharStatus.style.display = 'inline';
                setTimeout(() => saveVisionCharStatus.style.display = 'none', 3000);
            } catch (err) {
                console.error('Failed to save vision character:', err);
            }
            saveVisionCharBtn.innerText = '💾 Save Vision Character';
        });
    }

    // Draft Prompts File Editor Logic
    const draftPromptsEditor = document.getElementById('draft-prompts-editor');
    const saveDraftPromptsBtn = document.getElementById('save-draft-prompts-btn');
    const saveDraftStatus = document.getElementById('save-draft-status');

    if (draftPromptsEditor && saveDraftPromptsBtn) {
        fetch('http://localhost:3000/api/draft-prompts-file')
            .then(res => res.json())
            .then(data => { if (data.content !== undefined) draftPromptsEditor.value = data.content; })
            .catch(err => console.error('Failed to load drafts text:', err));

        saveDraftPromptsBtn.addEventListener('click', async () => {
            saveDraftPromptsBtn.innerText = 'Saving...';
            try {
                const freshContent = document.getElementById('draft-prompts-editor').value;
                const res = await fetch('http://localhost:3000/api/draft-prompts-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: freshContent })
                });
                
                if (!res.ok) throw new Error('Server returned HTTP ' + res.status);
                
                saveDraftStatus.style.display = 'inline';
                setTimeout(() => saveDraftStatus.style.display = 'none', 3000);
            } catch (err) { 
                console.error('Failed to save:', err);
                alert('ERROR: Failed to save the draft prompts: ' + err.message);
            }
            saveDraftPromptsBtn.innerText = '💾 Save Draft Prompts File';
        });
    }

    // References Preview Logic
    const refContainer = document.getElementById('references-preview-container');
    if (refContainer) {
        fetch('http://localhost:3000/api/references')
            .then(res => res.json())
            .then(data => {
                if (!data.images || data.images.length === 0) {
                    refContainer.innerHTML = 'No reference images found in the /references folder.';
                    return;
                }
                refContainer.innerHTML = '';
                data.images.forEach(filename => {
                    const img = document.createElement('img');
                    img.src = '/references/' + filename;
                    img.className = 'ref-thumb';
                    img.title = filename;
                    refContainer.appendChild(img);
                });
            })
            .catch(err => {
                refContainer.innerHTML = 'Error loading references.';
                console.error(err);
            });
    }

    // Connect Image Generator
    document.getElementById('start-images-btn').addEventListener('click', async () => {
        const imageCount = document.getElementById('image-count').value;
        const btn = document.getElementById('start-images-btn');
        
        btn.disabled = true;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Running...';
        document.getElementById('images-log').innerText = '';
        appendLog('images-log', `Starting Image Generation phase with Total Images = ${imageCount}...`);

        try {
            const response = await fetch('http://localhost:3000/api/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageCount: parseInt(imageCount, 10) })
            });
            const data = await response.json();
            appendLog('images-log', data.message || data.error);
        } catch (e) {
            appendLog('images-log', `Error connecting to server: ${e.message}`);
        }

        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Generating Line Art';
    });

    // Draft References Preview Logic
    const draftRefContainer = document.getElementById('draft-references-preview-container');
    if (draftRefContainer) {
        fetch('http://localhost:3000/api/draft-references')
            .then(res => res.json())
            .then(data => {
                if (!data.images || data.images.length === 0) {
                    draftRefContainer.innerHTML = 'No reference images found in the /draft_references folder.';
                    return;
                }
                draftRefContainer.innerHTML = '';
                data.images.forEach(filename => {
                    const img = document.createElement('img');
                    img.src = '/draft_references/' + filename;
                    img.className = 'ref-thumb';
                    img.title = filename;
                    draftRefContainer.appendChild(img);
                });
            })
            .catch(err => { draftRefContainer.innerHTML = 'Error loading draft references.'; });
    }

    // Connect Draft Generator
    const startDraftsBtn = document.getElementById('start-drafts-btn');
    if (startDraftsBtn) {
        startDraftsBtn.addEventListener('click', async () => {
            const imageCount = document.getElementById('draft-image-count').value;
            startDraftsBtn.disabled = true;
            startDraftsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Running...';
            document.getElementById('drafts-log').innerText = '';
            appendLog('drafts-log', `Starting Drafts phase with Total Images = ${imageCount}...`);

            try {
                const response = await fetch('http://localhost:3000/api/drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageCount: parseInt(imageCount, 10) })
                });
                const data = await response.json();
                appendLog('drafts-log', data.message || data.error);
            } catch (e) {
                appendLog('drafts-log', `Error connecting to server: ${e.message}`);
            }

            startDraftsBtn.disabled = false;
            startDraftsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Generating Drafts';
        });
    }

    // Connect Prompt Generator
    document.getElementById('start-prompts-btn').addEventListener('click', async () => {
        const numIdeas = document.getElementById('num-ideas').value;
        const character = document.getElementById('character').value;
        const theme = document.getElementById('theme').value;
        const notesElement = document.getElementById('concept-notes');
        const notes = notesElement ? notesElement.value.trim() : '';
        const basePrompt = document.getElementById('base-prompt').value;
        const draftTemplate = document.getElementById('draft-wrapper-prompt').value;
        const title = theme; // Use the theme as the filename natively!
        const btn = document.getElementById('start-prompts-btn');
        
        let finalPrompt = basePrompt
            .replace(/{numIdeas}/g, numIdeas)
            .replace(/{character}/g, character)
            .replace(/{theme}/g, theme);
            
        if (finalPrompt.includes('{notes}')) {
            finalPrompt = finalPrompt.replace(/{notes}/g, notes);
        } else if (notes) {
            finalPrompt += `\n\nNotes: ${notes}`;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Generating...';
        document.getElementById('prompts-log').innerText = '';
        appendLog('prompts-log', `Sending constructed concept to Gemini...`);

        try {
            const response = await fetch('http://localhost:3000/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptText: finalPrompt, title, draftTemplate, theme, numIdeas: parseInt(numIdeas) || 0 })
            });
            const data = await response.json();
            appendLog('prompts-log', data.status || `Error: ${data.error}`);
            
            if (data.result) {
                appendLog('prompts-log', '--- RESULT SAVED AND EXPORTED TO DRAFTS SUCCESSFULLY ---\n\n' + data.result);
            }
        } catch (e) {
            appendLog('prompts-log', `Error connecting to server: ${e.message}`);
        }

        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Generate & Wrap Concepts';
    });

    // Vision Generator Interactive Gallery Loader
    window.selectedVisionDrafts = [];
    function renderVisionGallery() {
        const gallery = document.getElementById('vision-gallery');
        if (!gallery) return;
        fetch('http://localhost:3000/api/draft-downloads')
            .then(res => res.json())
            .then(data => {
                gallery.innerHTML = '';
                if(!data.images || data.images.length === 0) {
                    gallery.innerHTML = 'No drafts found in the /draft_downloads natively.';
                    return;
                }
                data.images.forEach(filename => {
                    const img = document.createElement('img');
                    img.src = '/draft_downloads/' + filename;
                    img.style.height = '100px';
                    img.style.borderRadius = '6px';
                    img.style.cursor = 'pointer';
                    img.style.border = '3px solid transparent';
                    img.style.transition = 'all 0.2s';
                    
                    if (window.selectedVisionDrafts.includes(filename)) {
                        img.style.borderColor = 'var(--primary)';
                        img.style.transform = 'scale(0.95)';
                    }
                    
                    img.addEventListener('click', () => {
                        const idx = window.selectedVisionDrafts.indexOf(filename);
                        if (idx > -1) {
                            window.selectedVisionDrafts.splice(idx, 1);
                            img.style.borderColor = 'transparent';
                            img.style.transform = 'scale(1)';
                        } else {
                            window.selectedVisionDrafts.push(filename);
                            img.style.borderColor = 'var(--primary)';
                            img.style.transform = 'scale(0.95)';
                        }
                    });
                    gallery.appendChild(img);
                });
            });
    }

    // Connect Vision API
    const startVisionBtn = document.getElementById('start-vision-btn');
    if (startVisionBtn) {
        startVisionBtn.addEventListener('click', async () => {
            const visionCharStr = document.getElementById('vision-character').value || 'A cute anthropomorphic dog';
            const baseVisionText = document.getElementById('vision-prompt-text').value;
            const promptText = baseVisionText.replace(/\[character\]/gi, visionCharStr);
            const logPanel = document.getElementById('vision-log');
            
            startVisionBtn.disabled = true;
            startVisionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Analyzing...';
            logPanel.innerText = '';
            appendLog('vision-log', `Uploading ${window.selectedVisionDrafts.length} images into Gemini Vision engine...`);

            try {
                const response = await fetch('http://localhost:3000/api/vision-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectedImages: window.selectedVisionDrafts, promptText })
                });
                const data = await response.json();
                appendLog('vision-log', data.status || `Error: ${data.error}`);
                if (data.result) appendLog('vision-log', '--- SCRAPED OUTPUT (Appended natively to Line Art prompts.txt) ---\n\n' + data.result);
            } catch (e) {
                appendLog('vision-log', `Error: ${e.message}`);
            }

            startVisionBtn.disabled = false;
            startVisionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Reverse-Engineer Line Art Prompt';
        });
    }

    // Master Dashboard Auto-Pilot Sequence
    const startAutoBtn = document.getElementById('start-auto-btn');
    if (startAutoBtn) {
        let autoTimerInterval;
        let autoStartTime;

        function updateAutoTimer() {
            const now = new Date();
            const diff = Math.floor((now - autoStartTime) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            document.getElementById('auto-timer').innerText = `${m}:${s}`;
        }

        function setAutoProgress(percent, text) {
            document.getElementById('auto-status-text').innerText = text;
            if (percent !== null) document.getElementById('auto-progress-bar').style.width = percent + '%';
        }

        async function executeStageWithRetry(logPrefix, stageName, fetchCallFn) {
            let attempts = 0;
            while (attempts < 4) {
                if (window.isAutoPilotCancelled) throw new Error("Sequence gracefully aborted securely by user.");
                try {
                    if (attempts === 0) setAutoProgress(null, logPrefix + stageName + '...');
                    else if (attempts === 1) setAutoProgress(null, logPrefix + `[Retry 1/3] ${stageName} failed. Retrying natively in new automated tab...`);
                    else if (attempts === 2) {
                        setAutoProgress(null, logPrefix + `[Retry 2/3] ${stageName} failed. Waiting 30s before retrying...`);
                        await new Promise(r => setTimeout(r, 30000));
                    } else if (attempts === 3) {
                        setAutoProgress(null, logPrefix + `[Retry 3/3] Critical Failure. Restarting automated Chrome natively and waiting 5 minutes...`);
                        await fetch('http://localhost:3000/api/kill-chrome', { method: 'POST' }).catch(()=>null);
                        await new Promise(r => setTimeout(r, 300000)); // 5 mins
                    }

                    const res = await fetchCallFn();
                    if (!res.ok) {
                        const errData = await res.json().catch(()=>({}));
                        throw new Error(errData.error || `HTTP ${res.status}`);
                    }
                    return res;
                    
                } catch (err) {
                    console.warn(`Attempt ${attempts} failed for ${stageName}:`, err);
                    attempts++;
                    if (attempts >= 4) {
                        throw new Error(`Stage permanently failed after all timeouts: ${err.message}`);
                    }
                }
            }
        }

        startAutoBtn.addEventListener('click', async () => {
            const rawTheme = document.getElementById('auto-theme').value.trim();
            if(!rawTheme) return alert('Please enter a target theme!');

            window.isAutoPilotCancelled = false;
            startAutoBtn.disabled = true;
            document.getElementById('start-auto-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Pipeline Running...';
            document.getElementById('cancel-auto-btn').style.display = 'block';

            const uniqueRes = await fetch(`http://localhost:3000/api/get-unique-theme?base=${encodeURIComponent(rawTheme)}&_t=${Date.now()}`);
            const uniqueData = await uniqueRes.json();
            const theme = uniqueData.theme;

            document.getElementById('auto-progress-container').style.display = 'block';
            document.getElementById('auto-final-gallery').innerHTML = '';
            document.getElementById('auto-progress-bar').style.background = 'var(--primary)';
            
            autoStartTime = new Date();
            if(autoTimerInterval) clearInterval(autoTimerInterval);
            autoTimerInterval = setInterval(updateAutoTimer, 1000);
            updateAutoTimer();

            try {
                // STAGE 1 & 2: Concepts + Draft Wrapping
                setAutoProgress(10, 'Stage 1: Pinging Gemini for core concepts...');
                const basePrompt = document.getElementById('base-prompt').value;
                const draftTemplate = document.getElementById('draft-wrapper-prompt').value;
                const character = document.getElementById('character').value;
                const autoNotesElement = document.getElementById('auto-notes');
                const notes = autoNotesElement ? autoNotesElement.value.trim() : '';
                const numPages = parseInt(document.getElementById('auto-pages').value) || 1;

                let finalPrompt = basePrompt
                    .replace(/{numIdeas}/g, numPages)
                    .replace(/{character}/g, character)
                    .replace(/{theme}/g, rawTheme);
                    
                if (finalPrompt.includes('{notes}')) {
                    finalPrompt = finalPrompt.replace(/{notes}/g, notes);
                } else if (notes) {
                    finalPrompt += `\n\nNotes: ${notes}`;
                }
                
                const promptRes = await fetch('http://localhost:3000/api/prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promptText: finalPrompt, title: theme, draftTemplate, theme: rawTheme, numIdeas: numPages })
                });
                
                if (!promptRes.ok) throw new Error("Stage 1 execution halted.");
                const promptData = await promptRes.json();
                
                const rawPayloads = promptData.result.split('---').map(s => s.trim()).filter(s => s.length > 5);
                const rawIdeas = promptData.rawIdeas || [];
                if (rawPayloads.length === 0) throw new Error("Gemini returned zero parsable concepts.");
                
                // LOOP STAGES 2-5 FOR EACH INDIVIDUAL CONCEPT
                for (let i = 0; i < rawPayloads.length; i++) {
                    const conceptWrapper = rawPayloads[i];
                    const conceptSentence = rawIdeas[i] || "Concept parsed explicitly natively via JSON mapping array.";
                    const pageNum = i + 1;
                    const totalPages = rawPayloads.length;
                    const logPrefix = `[Page ${pageNum}/${totalPages}] `;
                    
                    try {
                        setAutoProgress(15 + (80 * (i/totalPages)), logPrefix + 'Initiating pipeline sequentially...');

                        // Route concept directly into draft templating storage organically
                        await fetch('http://localhost:3000/api/draft-prompts-file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: conceptWrapper })
                        });
                        
                        // STAGE 2: Draft Image Build
                        setAutoProgress(15 + (80 * (i/totalPages)) + 2, logPrefix + 'Stage 2: Translating concept into Draft geometry...');
                        await executeStageWithRetry(logPrefix, 'Stage 2: Translating concept into Draft geometry', () => 
                            fetch('http://localhost:3000/api/drafts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageCount: 1, theme: theme, loopIndex: pageNum })
                            })
                        );

                        // FETCH Latest Draft
                        setAutoProgress(15 + (80 * (i/totalPages)) + 10, logPrefix + 'Stage 3: Extracting Draft buffer bytes natively...');
                        const draftCheckRes = await fetch(`http://localhost:3000/api/draft-downloads?theme=${encodeURIComponent(theme)}&_t=${Date.now()}`);
                        const draftData = await draftCheckRes.json();
                        if (!draftData.images || draftData.images.length === 0) throw new Error("No draft images were extracted from network!");
                        
                        // Explicitly dynamically bind the latest draft matching our native filesystem loop renaming natively OR fallback to the last fetched node sequentially
                        const latestDraft = draftData.images.find(f => f.startsWith(`${pageNum}.`)) || draftData.images[draftData.images.length - 1];

                        // STAGE 4: Gemini Vision Prompt Reverse-Engineering
                        setAutoProgress(15 + (80 * (i/totalPages)) + 15, logPrefix + 'Stage 4: Reverse-Engineering Draft identically into Line Art prompt vector...');
                        const autoVisionCharStr = document.getElementById('auto-vision-character').value || 'A cute anthropomorphic dog';
                        const baseVisionText = document.getElementById('vision-prompt-text').value;
                        let visionPromptText = baseVisionText.replace(/\[character\]/gi, autoVisionCharStr);

                        if (visionPromptText.includes('[concept]')) {
                            visionPromptText = visionPromptText.replace(/\[concept\]/gi, conceptSentence);
                        } else if (visionPromptText.includes('Prompt concept sentence:')) {
                            visionPromptText = visionPromptText.replace('Prompt concept sentence:', `Prompt concept sentence: ${conceptSentence}`);
                        } else if (visionPromptText.includes('Image theme:')) {
                            visionPromptText = visionPromptText.replace('Image theme:', `Image theme: ${conceptSentence}`);
                        } else {
                            visionPromptText += `\n\nPrompt concept sentence: ${conceptSentence}`;
                        }

                        const visionRes = await executeStageWithRetry(logPrefix, 'Stage 4: Reverse-Engineering Draft', () => 
                            fetch('http://localhost:3000/api/vision-prompt', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ selectedImages: [latestDraft], promptText: visionPromptText, overwrite: true, theme: theme })
                            })
                        );
                        
                        const visionResJson = await visionRes.json();
                        const finalizedVisionPrompt = visionResJson.result;

                        // STAGE 5: Final Line Art Renderer
                        setAutoProgress(15 + (80 * (i/totalPages)) + 30, logPrefix + 'Stage 5: Executing Master Line Art renderer pipeline...');
                        await executeStageWithRetry(logPrefix, 'Stage 5: Executing Master Line Art renderer pipeline', () => 
                            fetch('http://localhost:3000/api/images', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageCount: 1, type: 'lineart', theme: theme, loopIndex: pageNum })
                            })
                        );

                    // Loop cycle completion modular card dump
                    const finalCheckRes = await fetch(`http://localhost:3000/api/lineart-downloads?theme=${encodeURIComponent(theme)}&_t=${Date.now()}`);
                    const finalData = await finalCheckRes.json();
                    
                    if (finalData.images && finalData.images.length > 0) {
                        
                        const activeLineArts = finalData.images.filter(img => img.startsWith(`${pageNum}.`) || img.startsWith(`${pageNum}_var`));
                        
                        try {
                            await fetch('http://localhost:3000/api/save-metadata', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    theme: theme,
                                    draftImage: latestDraft,
                                    prompt: finalizedVisionPrompt,
                                    lineArtImages: activeLineArts
                                })
                            });
                        } catch(e) {}
                        
                        const cardContainer = document.getElementById('auto-final-gallery');
                        
                        attachModularMasterCard({
                            draftImage: latestDraft,
                            prompt: finalizedVisionPrompt,
                            lineArtImages: [activeLineArts[0]]
                        }, theme, pageNum, cardContainer);
                        
                    }

                    // Master Display Card Rendered Natively by External Module
                    
                    } catch (loopErr) {
                        if (window.isAutoPilotCancelled) throw loopErr; // Escalate explicitly cancelled pipelines natively bypassing page skipping
                        console.error('Fatal loop failure for concept ' + pageNum, loopErr);
                        setAutoProgress(null, logPrefix + `Fatal Failure: ${loopErr.message}. Skipping to next page natively...`);
                        await new Promise(r => setTimeout(r, 4500)); // Wait exactly 4.5 seconds to let user read the warning before natively skipping to next loop!
                        continue; 
                    }
                }
                
                // DONE
                setAutoProgress(100, 'Sequence Secure: Entire pipeline loop completed sequentially!');
                clearInterval(autoTimerInterval);

            } catch(err) {
                setAutoProgress(100, `Sequence Extinguished / Cancelled: ${err.message}`);
                clearInterval(autoTimerInterval);
                document.getElementById('auto-progress-bar').style.background = window.isAutoPilotCancelled ? '#f59e0b' : '#ef4444'; // Yellow/Red
            }

            startAutoBtn.disabled = false;
            document.getElementById('start-auto-btn').innerHTML = 'Launch Auto-Pilot Pipeline';
            document.getElementById('cancel-auto-btn').style.display = 'none';
        });

        document.getElementById('cancel-auto-btn').addEventListener('click', async () => {
            if (confirm("Are you sure you want to completely cancel and terminate the active auto-pilot engine?")) {
                window.isAutoPilotCancelled = true;
                const cancelBtn = document.getElementById('cancel-auto-btn');
                cancelBtn.innerText = 'Killing Chrome...';
                cancelBtn.disabled = true;
                
                await fetch('http://localhost:3000/api/kill-chrome', { method: 'POST' }).catch(() => null);
                
                cancelBtn.innerText = 'Cancel';
                cancelBtn.disabled = false;
                cancelBtn.style.display = 'none';
            }
        });
    }

    // --- Master Dashboard History Engine ---
    async function fetchHistoricalThemes() {
        try {
            const res = await fetch('/api/themes');
            const data = await res.json();
            const sel = document.getElementById('history-themes');
            if (!sel) return;
            sel.innerHTML = '<option value="">Select a previous local project sequence...</option>';
            data.themes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = opt.innerText = t;
                sel.appendChild(opt);
            });
        } catch(e) {}
    }
    fetchHistoricalThemes();

    const loadBtn = document.getElementById('load-history-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            const target = document.getElementById('history-themes').value;
            if (!target) return alert('No architectural project explicitly targeted for local extraction.');
            
            if (autoTimerInterval) clearInterval(autoTimerInterval);
            
            document.getElementById('auto-progress-container').style.display = 'block';
            const gallery = document.getElementById('auto-final-gallery');
            gallery.innerHTML = '';
            
            document.getElementById('start-auto-btn').innerHTML = 'Engine Recovered / Terminals Synchronized';
            document.getElementById('start-auto-btn').disabled = false;
            document.getElementById('auto-progress-bar').style.background = '#10b981';
            document.getElementById('auto-progress-bar').style.width = '100%';
            document.getElementById('auto-status-text').innerHTML = `Fully Rendered Identical Replica OS State of [${target}]`;
            document.getElementById('auto-timer').style.display = 'none';
            
            try {
                const metaRes = await fetch(`/api/theme-metadata?theme=${encodeURIComponent(target)}`);
                const metaData = await metaRes.json();
                
                if (!metaData || metaData.length === 0) {
                    return gallery.innerHTML = '<p style="color:var(--text-secondary);">Native JSON anchor corrupted or purged. File dependencies structurally lost.</p>';
                }
                
                metaData.forEach((item, i) => {
                    attachModularMasterCard(item, target, i + 1, gallery);
                });
            } catch(e) {
                alert('Fatal JSON Extraction IO Fault.');
            }
        });
    }

    function attachModularMasterCard(item, theme, pageNum, cardContainer) {
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.background = '#1e293b';
        card.style.padding = '16px';
        card.style.borderRadius = '12px';
        card.style.margin = '24px 0';
        card.style.width = '100%';

        const imagesRow = document.createElement('div');
        imagesRow.style.display = 'flex';
        imagesRow.style.gap = '16px';
        imagesRow.style.flexWrap = 'wrap';

        const draftImg = document.createElement('img');
        draftImg.src = `/draft_downloads/${theme}/${item.draftImage}`;
        draftImg.style.width = 'calc(50% - 8px)';
        draftImg.style.borderRadius = '8px';
        imagesRow.appendChild(draftImg);

        for (const la of item.lineArtImages) {
            const finalImg = document.createElement('img');
            finalImg.src = `/line_art/${theme}/${la}`;
            finalImg.style.width = 'calc(50% - 8px)';
            finalImg.style.borderRadius = '8px';
            imagesRow.appendChild(finalImg);
        }
        card.appendChild(imagesRow);

        const promptArea = document.createElement('textarea');
        promptArea.value = item.prompt; 
        promptArea.style.width = '100%';
        promptArea.style.height = '120px';
        promptArea.style.marginTop = '16px';
        promptArea.style.background = '#0f172a';
        promptArea.style.color = '#cbd5e1';
        promptArea.style.padding = '12px';
        promptArea.style.borderRadius = '8px';
        promptArea.style.border = '1px solid #334155';
        promptArea.style.fontFamily = 'monospace';
        card.appendChild(promptArea);

        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '12px';
        actionsRow.style.marginTop = '16px';

        const varInput = document.createElement('input');
        varInput.type = 'number';
        varInput.value = '3';
        varInput.min = '1';
        varInput.max = '10';
        varInput.style.width = '80px';
        varInput.style.padding = '8px';
        varInput.style.borderRadius = '6px';
        varInput.style.border = '1px solid #334155';
        varInput.style.background = '#0f172a';
        varInput.style.color = 'white';

        const varBtn = document.createElement('button');
        varBtn.className = 'primary-btn';
        varBtn.style.padding = '8px 16px';
        varBtn.style.flex = '1';
        varBtn.innerText = 'Generate Variations natively within bounds';
        
        varBtn.onclick = async () => {
            const n = parseInt(varInput.value) || 1;
            varBtn.disabled = true;
            varBtn.innerText = 'Extracting Chromium API Buffers natively...';
            
            try {
                await fetch('http://localhost:3000/api/save-prompts-file', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ content: promptArea.value })
                });

                const genRes = await fetch('http://localhost:3000/api/images', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ imageCount: n, type: 'lineart', theme: theme, loopIndex: pageNum })
                });

                const newFinalData = await fetch(`http://localhost:3000/api/lineart-downloads?theme=${encodeURIComponent(theme)}&_t=${Date.now()}`);
                const parsedNewData = await newFinalData.json(); 
                
                const variationArts = parsedNewData.images.filter(img => img.startsWith(`${pageNum}.`) || img.startsWith(`${pageNum}_var`));
                
                try {
                    await fetch('http://localhost:3000/api/save-metadata', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            theme: theme,
                            draftImage: item.draftImage,
                            prompt: promptArea.value,
                            lineArtImages: variationArts
                        })
                    });
                } catch(e) {} 
                
                imagesRow.innerHTML = '';
                imagesRow.appendChild(draftImg);
                
                for (const va of variationArts) {
                    const newImg = document.createElement('img');
                    newImg.src = parsedNewData.folderPath + va;
                    newImg.style.width = 'calc(50% - 8px)';
                    newImg.style.borderRadius = '8px';
                    imagesRow.appendChild(newImg);
                }
            } catch(e) {}
            
            varBtn.disabled = false;
            varBtn.innerText = 'Generate Variations natively within bounds';
        };

        actionsRow.appendChild(varInput);
        actionsRow.appendChild(varBtn);
        card.appendChild(actionsRow);
        cardContainer.appendChild(card);
    }
});
