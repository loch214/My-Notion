import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const MODEL_PROVIDERS = {
  'gemini-2.5-flash': 'gemini',
  'gemini-3.1-pro': 'gemini',
  'claude-sonnet-4': 'claude',
  'claude-opus-4': 'claude',
} as const;

type SupportedModel = keyof typeof MODEL_PROVIDERS;

let geminiClient: GoogleGenAI | null = null;
let claudeClient: Anthropic | null = null;

function getGeminiClient() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      geminiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return geminiClient;
}

function getClaudeClient() {
  if (!claudeClient) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      claudeClient = new Anthropic({ apiKey: key });
    }
  }
  return claudeClient;
}

function safeModel(model: unknown): SupportedModel {
  if (typeof model === 'string' && model in MODEL_PROVIDERS) {
    return model as SupportedModel;
  }
  return 'gemini-2.5-flash';
}

function transcript(history: any[] = []) {
  return history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');
}

function mockResponse(message: string, model: SupportedModel, contextLabel: string) {
  return {
    role: 'model',
    text: `Mock response for ${contextLabel} using ${model}. Add your API key in backend/.env when you're ready, then I can answer for real.\n\nYou said: ${message}`,
  };
}

async function runGemini(model: SupportedModel, systemInstruction: string, history: any[], message: string) {
  const client = getGeminiClient();
  if (!client) {
    return null;
  }

  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const response = await client.models.generateContent({
    model,
    contents: [...contents, { role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction },
  });

  return response.text ?? '';
}

async function runClaude(model: SupportedModel, systemInstruction: string, history: any[], message: string) {
  const client = getClaudeClient();
  if (!client) {
    return null;
  }

  const messages = history.map((msg) => ({
    role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: String(msg.text),
  }));

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemInstruction,
    messages: [...messages, { role: 'user', content: message }],
  });

  const text = Array.isArray(response.content)
    ? response.content.map((block: any) => (typeof block.text === 'string' ? block.text : '')).join('')
    : '';

  return text;
}

async function generateChatReply(params: {
  model: SupportedModel;
  systemInstruction: string;
  history: any[];
  message: string;
  contextLabel: string;
}) {
  const provider = MODEL_PROVIDERS[params.model];
  try {
    if (provider === 'gemini') {
      const text = await runGemini(params.model, params.systemInstruction, params.history, params.message);
      if (text !== null) {
        return text;
      }
    } else {
      const text = await runClaude(params.model, params.systemInstruction, params.history, params.message);
      if (text !== null) {
        return text;
      }
    }
  } catch (error) {
    console.error(`${provider} chat error:`, error);
  }

  return mockResponse(params.message, params.model, params.contextLabel).text;
}

app.post('/api/chat/global', async (req, res) => {
  try {
    const { message, history = [], context, model = 'gemini-2.5-flash' } = req.body;
    const selectedModel = safeModel(model);
    const provider = MODEL_PROVIDERS[selectedModel];
    const systemInstruction = `You are a calm, precise university productivity assistant inside StudentOS.\nUse the app context below to stay helpful, practical, and concise.\n\nApp context:\n${JSON.stringify(context, null, 2)}\n\nConversation transcript:\n${transcript(history)}`;

    const text = await generateChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message,
      contextLabel: `global assistant (${provider})`,
    });

    res.json({ role: 'model', text });
  } catch (error: any) {
    console.error('Global Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat/module', async (req, res) => {
  try {
    const { message, moduleName, files, history = [], model = 'gemini-2.5-flash' } = req.body;
    const selectedModel = safeModel(model);
    const provider = MODEL_PROVIDERS[selectedModel];
    const fileList = Array.isArray(files) ? files.map((file: any) => file.name).join(', ') : 'no files yet';
    const systemInstruction = `You are a focused tutor for the module "${moduleName}". Keep the style modern, structured, and grounded in the user's study materials.\n\nUploaded files for this module: ${fileList}.\nConversation transcript:\n${transcript(history)}`;

    const text = await generateChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message,
      contextLabel: `module assistant for ${moduleName} (${provider})`,
    });

    res.json({ role: 'model', text });
  } catch (error: any) {
    console.error('Module Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      id: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      geminiFileUri: 'mock-uri-' + req.file.filename,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure frontend is running on http://localhost:5173`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not set - Gemini requests will use mock responses');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set - Claude requests will use mock responses');
  }
});
