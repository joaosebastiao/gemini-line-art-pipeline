import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runImageGeneration } from './image-generator.js';
import { runPromptGeneration } from './prompt-generator.js';
import { runVisionPromptGeneration } from './vision-prompt-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/references', express.static(path.join(__dirname, 'references')));
app.use('/draft_references', express.static(path.join(__dirname, 'draft_references')));
app.use('/draft_downloads', express.static(path.join(__dirname, 'draft_downloads')));
app.use('/line_art', express.static(path.join(__dirname, 'line art')));

app.post('/api/images', async (req, res) => {
    const { imageCount, type, theme } = req.body;
    try {
        await runImageGeneration(imageCount, type || 'lineart', theme);
        res.json({ message: `Successfully completed line art phase with Total Images = ${imageCount}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drafts', async (req, res) => {
    const { imageCount } = req.body;
    try {
        await runImageGeneration(imageCount, 'draft');
        res.json({ message: `Successfully completed drafts phase with Total Images = ${imageCount}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/prompts', async (req, res) => {
    const { promptText, title, draftTemplate, theme, numIdeas } = req.body;
    try {
        const result = await runPromptGeneration(promptText, title, draftTemplate, theme, parseInt(numIdeas) || 0);
        res.json({ status: 'Successfully pulled ideas and dynamically wrapped them!', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/references', (req, res) => {
    try {
        const refDir = path.join(__dirname, 'references');
        if (!fs.existsSync(refDir)) {
            res.json({ images: [] });
            return;
        }
        const files = fs.readdirSync(refDir)
            .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i));
        res.json({ images: files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/draft-references', (req, res) => {
    try {
        const refDir = path.join(__dirname, 'draft_references');
        if (!fs.existsSync(refDir)) {
            res.json({ images: [] });
            return;
        }
        const files = fs.readdirSync(refDir)
            .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i));
        res.json({ images: files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/draft-downloads', (req, res) => {
    try {
        const refDir = path.join(__dirname, 'draft_downloads');
        if (!fs.existsSync(refDir)) {
            res.json({ images: [] });
            return;
        }
        const files = fs.readdirSync(refDir)
            .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i))
            .sort((a,b) => {
                return fs.statSync(path.join(refDir, b)).mtime.getTime() - fs.statSync(path.join(refDir, a)).mtime.getTime(); 
            });
        res.json({ images: files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vision-prompt', async (req, res) => {
    const { selectedImages, promptText, overwrite } = req.body;
    try {
        const result = await runVisionPromptGeneration(selectedImages, promptText, overwrite);
        res.json({ status: 'Successfully scraped line art prompt!', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/lineart-downloads', (req, res) => {
    const { theme } = req.query;
    try {
        const safeTheme = theme ? theme.replace(/[^a-z0-9 _-]/gi, '_').trim() : '';
        const refDir = safeTheme ? path.join(__dirname, 'line art', safeTheme) : path.join(__dirname, 'line art');
        const folderUrlPath = `/line_art/${safeTheme ? encodeURIComponent(safeTheme) + '/' : ''}`;
        
        if (!fs.existsSync(refDir)) {
            res.json({ images: [], folderPath: folderUrlPath });
            return;
        }
        
        const files = fs.readdirSync(refDir)
            .filter(f => f.match(/\.(jpe?g|png|gif|webp)$/i))
            .sort((a,b) => {
                return fs.statSync(path.join(refDir, b)).mtime.getTime() - fs.statSync(path.join(refDir, a)).mtime.getTime(); 
            });
            
        res.json({ images: files, folderPath: folderUrlPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PROMPTS_FILE = path.join(__dirname, 'prompts.txt');
const DRAFT_PROMPTS_FILE = path.join(__dirname, 'draft_prompts.txt');
const BASE_PROMPT_FILE = path.join(__dirname, 'base_prompt_template.txt');
const WRAPPER_PROMPT_FILE = path.join(__dirname, 'draft_wrapper_template.txt');
const VISION_PROMPT_FILE = path.join(__dirname, 'vision_prompt_template.txt');

// Initialize physical filesystem components automatically if not found
if (!fs.existsSync(BASE_PROMPT_FILE)) {
    const defaultText = `Brainstorm {numIdeas} page ideas for a cozy coloring book. Each idea should be just one sentence, and include a setting, and a character doing an action. Be as varied as possible in your settings and actions. I'm going to use your answer as a prompt, so write three dashes --- like this between each idea. Also don't write anything before or after the ideas.\n\nFor the character, always say: {character}\n\nTheme: {theme}`;
    fs.writeFileSync(BASE_PROMPT_FILE, defaultText, 'utf-8');
}
if (!fs.existsSync(WRAPPER_PROMPT_FILE)) {
    const defaultWrapperText = `Aspect ratio: 1:1\n\nStyle: Exactly the same as the reference images. Make everything slightly oversized, with no small details. Everything should be smooth and rounded, as if every element of the illustration is cute and inflated. There are no sharp edges in any lines. Everything looks close together and crowded. The character is surrounded by lots of varied visual elements. No text in the image.\n\nTheme: {theme}.\n\nCreate a scene in perspective\n\nGenerate an image of:\n{idea}`;
    fs.writeFileSync(WRAPPER_PROMPT_FILE, defaultWrapperText, 'utf-8');
}
if (!fs.existsSync(VISION_PROMPT_FILE)) {
    const defaultVisionText = `Analyze the selected images. Write a highly detailed description of them functioning as a standalone text prompt formatted identically for a Line Art AI generator. Output absolutely nothing except the pure image prompt.`;
    fs.writeFileSync(VISION_PROMPT_FILE, defaultVisionText, 'utf-8');
}
if (!fs.existsSync(path.join(__dirname, 'draft_references'))) fs.mkdirSync(path.join(__dirname, 'draft_references'), { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'draft_downloads'))) fs.mkdirSync(path.join(__dirname, 'draft_downloads'), { recursive: true });
if (!fs.existsSync(DRAFT_PROMPTS_FILE)) fs.writeFileSync(DRAFT_PROMPTS_FILE, '', 'utf-8');

app.get('/api/prompts-file', (req, res) => {
    try {
        if (!fs.existsSync(PROMPTS_FILE)) {
            res.json({ content: '' });
        } else {
            const content = fs.readFileSync(PROMPTS_FILE, 'utf-8');
            res.json({ content });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/prompts-file', (req, res) => {
    const { content } = req.body;
    try {
        fs.writeFileSync(PROMPTS_FILE, content, 'utf-8');
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/draft-prompts-file', (req, res) => {
    try {
        if (!fs.existsSync(DRAFT_PROMPTS_FILE)) {
            res.json({ content: '' });
        } else {
            const content = fs.readFileSync(DRAFT_PROMPTS_FILE, 'utf-8');
            res.json({ content });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/draft-prompts-file', (req, res) => {
    const { content } = req.body;
    try {
        fs.writeFileSync(DRAFT_PROMPTS_FILE, content, 'utf-8');
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/base-prompt-file', (req, res) => {
    try {
        const content = fs.existsSync(BASE_PROMPT_FILE) ? fs.readFileSync(BASE_PROMPT_FILE, 'utf-8') : '';
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/base-prompt-file', (req, res) => {
    const { content } = req.body;
    try {
        fs.writeFileSync(BASE_PROMPT_FILE, content, 'utf-8');
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/wrapper-prompt-file', (req, res) => {
    try {
        const content = fs.existsSync(WRAPPER_PROMPT_FILE) ? fs.readFileSync(WRAPPER_PROMPT_FILE, 'utf-8') : '';
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wrapper-prompt-file', (req, res) => {
    const { content } = req.body;
    try {
        fs.writeFileSync(WRAPPER_PROMPT_FILE, content, 'utf-8');
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/vision-prompt-file', (req, res) => {
    try {
        const content = fs.existsSync(VISION_PROMPT_FILE) ? fs.readFileSync(VISION_PROMPT_FILE, 'utf-8') : '';
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vision-prompt-file', (req, res) => {
    const { content } = req.body;
    try {
        fs.writeFileSync(VISION_PROMPT_FILE, content, 'utf-8');
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Gemini Suite Dashboard running at http://localhost:${PORT}`);
});
