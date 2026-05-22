import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up temporary local storage for uploaded files before sending to Gemini
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not set. AI features will be disabled or mocked.");
    } else {
      ai = new GoogleGenAI({ apiKey: key });
    }
  }
  return ai;
}

// Global Chat Endpoint
app.post('/api/chat/global', async (req, res) => {
  try {
    const { message, history = [], context, model = 'gemini-2.5-flash' } = req.body;
    const aiClient = getAI();
    
    if (!aiClient) {
      return res.json({ 
        role: 'model', 
        text: "I am a mock response because the GEMINI_API_KEY environment variable is not defined. Set it to chat with me!"
      });
    }

    const systemInstruction = `You are a helpful study assistant for a university student.
The user is currently navigating their StudentOS app.
Context about their app state (modules, tasks, upcoming events):
${JSON.stringify(context, null, 2)}`;

    const chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await aiClient.models.generateContent({
      model: model,
      contents: [...chatHistory, { role: 'user', parts: [{ text: message }]}],
      config: {
        systemInstruction,
      }
    });

    res.json({ role: 'model', text: response.text });
  } catch (error: any) {
    console.error('Global Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Module-Specific Chat Endpoint
app.post('/api/chat/module', async (req, res) => {
  try {
    const { message, moduleName, files, history = [], model = 'gemini-2.5-flash' } = req.body;
    const aiClient = getAI();
    
    if (!aiClient) {
      return res.json({ 
        role: 'model', 
        text: `Mock module response for ${moduleName}. No API key set.`
      });
    }

    const systemInstruction = `You are a tutor for the module "${moduleName}".
The user has the following files uploaded for this module: ${files.map((f:any) => f.name).join(', ')}.
Assist them with their studies.`;

    const chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await aiClient.models.generateContent({
      model: model,
      contents: [...chatHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
      }
    });

    res.json({ role: 'model', text: response.text });
  } catch (error: any) {
    console.error('Module Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // In a real app we'd upload to Gemini File API here:
    // const aiClient = getAI();
    // const uploadResult = await aiClient.files.upload({ file: req.file.path, mimeType: req.file.mimetype });
    // return res.json({ id: req.file.filename, geminiFileUri: uploadResult.uri })
    
    // For now, simulate success
    res.json({ 
      id: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      geminiFileUri: 'mock-uri-' + req.file.filename
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v4 syntax
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
