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
                await fetch('http://localhost:3000/api/draft-prompts-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: draftPromptsEditor.value })
                });
                saveDraftStatus.style.display = 'inline';
                setTimeout(() => saveDraftStatus.style.display = 'none', 3000);
            } catch (err) { console.error('Failed to save:', err); }
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
        const basePrompt = document.getElementById('base-prompt').value;
        const draftTemplate = document.getElementById('draft-wrapper-prompt').value;
        const title = theme; // Use the theme as the filename natively!
        const btn = document.getElementById('start-prompts-btn');
        
        const finalPrompt = basePrompt
            .replace(/{numIdeas}/g, numIdeas)
            .replace(/{character}/g, character)
            .replace(/{theme}/g, theme);
        
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
            const promptText = document.getElementById('vision-prompt-text').value;
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
            document.getElementById('auto-progress-bar').style.width = percent + '%';
        }

        startAutoBtn.addEventListener('click', async () => {
            const theme = document.getElementById('auto-theme').value.trim();
            if(!theme) return alert('Please enter a target theme!');

            startAutoBtn.disabled = true;
            document.getElementById('start-auto-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Pipeline Running...';
            document.getElementById('auto-progress-container').style.display = 'block';
            document.getElementById('auto-final-gallery').innerHTML = '';
            document.getElementById('auto-progress-bar').style.background = 'var(--primary)';
            
            autoStartTime = new Date();
            if(autoTimerInterval) clearInterval(autoTimerInterval);
            autoTimerInterval = setInterval(updateAutoTimer, 1000);
            updateAutoTimer();

            try {
                // STAGE 1 & 2: Concepts + Draft Wrapping (Force NumIdeas: 1)
                setAutoProgress(15, 'Stage 1: Pinging Gemini for core concept...');
                const basePrompt = document.getElementById('base-prompt').value;
                const draftTemplate = document.getElementById('draft-wrapper-prompt').value;
                const character = document.getElementById('character').value;

                const finalPrompt = basePrompt
                    .replace(/{numIdeas}/g, '1')
                    .replace(/{character}/g, character)
                    .replace(/{theme}/g, theme);
                
                const promptRes = await fetch('http://localhost:3000/api/prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promptText: finalPrompt, title: theme, draftTemplate, theme, numIdeas: 1 })
                });
                if (!promptRes.ok) throw new Error("Stage 1 execution halted.");

                // STAGE 3: Draft Image Build (Force Count: 1)
                setAutoProgress(35, 'Stage 2: Translating concepts into Draft geometry...');
                const draftRunRes = await fetch('http://localhost:3000/api/drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageCount: 1 })
                });
                if (!draftRunRes.ok) throw new Error("Stage 2 execution halted.");

                // FETCH Latest Draft
                setAutoProgress(55, 'Stage 3: Extracting Draft buffer bytes natively...');
                const draftCheckRes = await fetch('http://localhost:3000/api/draft-downloads');
                const draftData = await draftCheckRes.json();
                if (!draftData.images || draftData.images.length === 0) throw new Error("No draft images were extracted from network!");
                const latestDraft = draftData.images[0];

                // STAGE 4: Gemini Vision Prompt Reverse-Engineering
                setAutoProgress(70, 'Stage 4: Reverse-Engineering Draft payload identically into Line Art prompt vector...');
                const visionPromptText = document.getElementById('vision-prompt-text').value;
                const visionRes = await fetch('http://localhost:3000/api/vision-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectedImages: [latestDraft], promptText: visionPromptText, overwrite: true })
                });
                if (!visionRes.ok) throw new Error("Stage 4 execution halted.");

                // STAGE 5: Final Line Art Renderer (Force Count: 1)
                setAutoProgress(85, 'Stage 5: Executing final Master Line Art renderer pipeline...');
                const lineArtRes = await fetch('http://localhost:3000/api/images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageCount: 1, type: 'lineart', theme: theme })
                });
                if (!lineArtRes.ok) throw new Error("Stage 5 execution halted.");

                // DONE
                setAutoProgress(100, 'Sequence Secure: Master output delivered to gallery!');
                clearInterval(autoTimerInterval);

                const finalCheckRes = await fetch(`http://localhost:3000/api/lineart-downloads?theme=${encodeURIComponent(theme)}`);
                const finalData = await finalCheckRes.json();
                
                if (finalData.images && finalData.images.length > 0) {
                    const finalImg = document.createElement('img');
                    finalImg.src = finalData.folderPath + finalData.images[0];
                    finalImg.style.maxHeight = '400px';
                    finalImg.style.borderRadius = '8px';
                    finalImg.style.border = '1px solid var(--border)';
                    document.getElementById('auto-final-gallery').appendChild(finalImg);
                }

            } catch(err) {
                setAutoProgress(100, `Pipeline Critical Failure: ${err.message}`);
                clearInterval(autoTimerInterval);
                document.getElementById('auto-progress-bar').style.background = '#ef4444'; // Red error
            }

            startAutoBtn.disabled = false;
            document.getElementById('start-auto-btn').innerHTML = 'Launch Auto-Pilot Pipeline';
        });
    }
});
