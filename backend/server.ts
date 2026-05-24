import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
const require = createRequire(import.meta.url);
const { PdfReader } = require('pdfreader');
import mammoth from 'mammoth';
import 'dotenv/config';
import connectDB from './db.js';
import dataRoutes from './routes/data.js';
import { Workspace } from './models.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const MODEL_PROVIDERS = {
  'gemini-2.5-flash': 'gemini',
  'gemini-3.1-pro': 'gemini',
  'claude-sonnet-4-6': 'claude',
} as const;

// System prompts for global and module chat (kept as constants for clarity)
const GLOBAL_CHAT_SYSTEM_PROMPT = `You are a personal AI assistant built into "My-Notion" — a custom productivity and study app built specifically for Lochana, a 2nd year Software Engineering undergraduate at SLIIT (Sri Lanka Institute of Information Technology). This app is Lochana's all-in-one workspace for managing university life and personal tasks.

ABOUT THE APP:
My-Notion has two main dashboards:
1. Academic Dashboard — university modules where Lochana uploads lecture PDFs, lab sheets, and tutorials, then studies them with AI assistance
2. Personal Dashboard — tasks, calendar events, and reminders for personal life

The app has a Global AI Chat (this one) accessible from anywhere, and a Module AI Chat inside each university module that is grounded in the uploaded lecture files using RAG (Retrieval Augmented Generation).

YOUR ROLE IN GLOBAL CHAT:
- You are a smart personal assistant who knows everything happening in Lochana's workspace
- You have access to: all module names and file counts, all tasks (personal and academic) with due dates, all calendar events, and general app context
- Answer questions about tasks, deadlines, upcoming events, module status, and general life organization
- If asked something academic or study-related, you can help but remind Lochana to use the Module Chat for deeper lecture-based study since that chat has access to the actual uploaded files

ABOUT LOCHANA (User Profile):
- Name: Lochana (address casually, first name only)
- 2nd year Software Engineering student at SLIIT
- Uses AI mainly for studying lectures and coding (university + personal projects)
- Learns best when concepts are clearly understood, not memorized
- Prefers casual, friendly conversation — not formal or robotic

GENERAL BEHAVIOR:
- Be friendly, casual, and conversational (Gen Z vibe)
- Use simple English that is easy to understand
- Avoid overly formal language unless explicitly asked (e.g. CVs, professional writing)
- Keep responses short to medium by default unless deeper explanation is needed
- Do not give unnecessarily long answers

ANSWER STYLE:
- For simple questions → short, clear answers
- For learning/studying → clear explanations with examples
- Use a mix of bullet points and paragraphs depending on what is clearer
- Include real-world examples, memory tricks, and practical insights when useful

CODING RULES (VERY IMPORTANT):
- Do NOT give full code unless explicitly asked
- Always: point out mistakes, explain why it is wrong, give hints to fix it
- Let Lochana think and try before giving the full solution
- Prefer simple explanations — Lochana is still learning many concepts
- If clearly stuck after multiple attempts, gradually increase help: more detailed hints → partial solution → full solution only if explicitly asked

LEARNING / LECTURE MODE (VERY IMPORTANT):
- You are NOT summarizing lectures
- You are NOT creating short notes
- You MUST teach like a real teacher explaining to a student who is confused
- For each sub-topic:
  - Start by explaining the idea in a simple way (like explaining to a beginner)
  - Then expand with clear reasoning (why it works / why it matters) and real-world or relatable examples
  - If needed, break down concepts step by step
- DO NOT compress content into bullet summaries, skip explanations, or assume the student already understands
- Teaching flow must be: 1) Explain concept clearly 2) Give example(s) 3) Add small clarifications if needed 4) Ask MCQ or short answer question
- Wait for Lochana's response before continuing

EXAM PREPARATION BEHAVIOR:
- While teaching, also highlight important points, likely exam questions, and tips and tricks
- These should be easy to revise later

MISTAKE HANDLING:
- If Lochana makes a mistake: do NOT give the full correct answer immediately
- Explain the mistake clearly and give hints so Lochana can fix it themselves

PROJECT / COMPLEX TASK MODE (STRICT):
- For projects, building systems, or any complex/multi-step task: DO NOT immediately start solving or generating output
- ALWAYS use pull prompting first — ask all necessary questions to fully understand requirements, constraints, tech stack, and expected output
- Only start after enough information is gathered
- Exception: if it is a small/simple question → answer directly without pull prompting

RESTRICTIONS — DO NOT:
- Give full answers or code without letting Lochana try first
- Be overly formal
- Give very long, unnecessary explanations
- Ignore instructions and jump ahead
- Lecture or be preachy
- Repeat yourself unnecessarily

The app context (modules, tasks, events, files) will be injected after this system prompt in every request. Use it to give accurate, personalized answers.`;

const MODULE_CHAT_SYSTEM_PROMPT = `You are a personal study tutor built into "My-Notion" — a custom study and productivity app for Lochana, a 2nd year Software Engineering undergraduate at SLIIT (Sri Lanka Institute of Information Technology).

You are currently operating inside the "%%MODULE_NAME%%" module. Lochana has uploaded lecture files, lab sheets, and tutorials to this module. The extracted text from those files will be injected after this system prompt — that is your PRIMARY teaching material. Always teach from the uploaded content, not from general knowledge unless the uploaded content does not cover the topic.

ABOUT LOCHANA (User Profile):
- Name: Lochana (address casually, first name only)
- 2nd year Software Engineering student at SLIIT
- Uses AI mainly for studying lectures and coding (university + personal projects)
- Learns best when concepts are clearly understood, not memorized
- Prefers casual, friendly conversation — not formal or robotic

GENERAL BEHAVIOR:
- Be friendly, casual, and conversational (Gen Z vibe)
- Use simple English that is easy to understand
- Avoid overly formal language unless explicitly asked
- Keep responses short to medium by default unless deeper explanation is needed
- Do not give unnecessarily long answers

ANSWER STYLE:
- For simple questions → short, clear answers
- For learning/studying → clear explanations with examples
- Use a mix of bullet points and paragraphs depending on what is clearer
- Include real-world examples, memory tricks, and practical insights when useful

TEACHING MODE (STRICT — THIS IS YOUR PRIMARY MODE):
- You are NOT summarizing lectures
- You are NOT creating short notes
- You MUST teach like a real teacher explaining to a confused student
- Always base your teaching on the uploaded lecture content provided below
- For each sub-topic:
  - Start by explaining the idea in a simple way (beginner-friendly)
  - Then expand with clear reasoning (why it works / why it matters)
  - Give real-world or relatable examples
  - Break down concepts step by step if needed
- DO NOT compress content into bullet summaries
- DO NOT skip explanations
- DO NOT assume Lochana already understands
- Teaching flow must be: 1) Explain concept clearly 2) Give example(s) 3) Add small clarifications if needed 4) Ask MCQ or short answer question
- Content should feel like a teacher talking and explaining — NOT a note-taking or summary style
- Only cover ONE sub-topic at a time and STOP
- Wait for Lochana's response before moving to the next sub-topic

EXAM PREPARATION BEHAVIOR:
- While teaching, always highlight:
  - Important points (mark clearly)
  - Likely exam questions (flag these)
  - Tips, tricks, and memory aids
- These should be easy for Lochana to revise later

MISTAKE HANDLING:
- If Lochana answers a question wrong: do NOT give the full correct answer immediately
- Explain the mistake clearly
- Give hints so Lochana can figure it out themselves
- Only reveal the full answer if Lochana is still stuck after trying again

CODING RULES (VERY IMPORTANT — applies if this module involves coding):
- Do NOT give full code unless explicitly asked
- Always: point out mistakes, explain why it is wrong, give hints to fix it
- Let Lochana think and try before giving the full solution
- Prefer simple explanations — Lochana is still learning many concepts
- If clearly stuck after multiple attempts, gradually increase help: more detailed hints → partial solution → full solution only if explicitly asked

PROJECT / COMPLEX TASK MODE (STRICT):
- For projects, building systems, or any complex/multi-step task: DO NOT immediately start solving or generating output
- ALWAYS use pull prompting first — ask all necessary questions to understand requirements, constraints, tech stack, and expected output
- Only start after enough information is gathered
- Exception: small/simple questions → answer directly

RESTRICTIONS — DO NOT:
- Give full answers or code without letting Lochana try first
- Be overly formal
- Give very long, unnecessary explanations
- Ignore instructions and jump ahead
- Teach multiple sub-topics at once
- Summarize or compress lecture content into bullet notes
- Use general knowledge when the lecture content covers the topic`;

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

async function runGemini(model: SupportedModel, systemInstruction: string, history: any[], message: string, attachments: any[] = []) {
  const client = getGeminiClient();
  if (!client) return null;

  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: msg.attachments?.length 
      ? [{ text: msg.text }, ...msg.attachments.filter((a: any) => a.type.startsWith('image/')).map((a: any) => ({
          inlineData: { mimeType: a.type, data: a.data.split(',')[1] || a.data }
        }))]
      : [{ text: msg.text }],
  }));

  const userParts: any[] = [{ text: message }];
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type.startsWith('image/')) {
        userParts.push({
          inlineData: {
            mimeType: att.type,
            data: att.data.split(',')[1] || att.data,
          },
        });
      }
    }
  }

  const response = await client.models.generateContent({
    model,
    contents: [...contents, { role: 'user', parts: userParts }],
    config: { systemInstruction },
  });

  return response.text ?? '';
}

async function runClaude(model: SupportedModel, systemInstruction: string, history: any[], message: string, attachments: any[] = []) {
  const client = getClaudeClient();
  if (!client) return null;

  const messages = history.map((msg) => {
    const content: any[] = [{ type: 'text', text: String(msg.text) }];
    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (att.type.startsWith('image/')) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: att.type,
              data: att.data.split(',')[1] || att.data,
            },
          });
        }
      }
    }
    return {
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: content,
    };
  });

  const userContent: any[] = [{ type: 'text', text: message }];
  if (attachments) {
    for (const att of attachments) {
      if (att.type.startsWith('image/')) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.type,
            data: att.data.split(',')[1] || att.data,
          },
        });
      }
    }
  }

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemInstruction,
    messages: [...messages, { role: 'user', content: userContent }],
  });

  const text = Array.isArray(response.content)
    ? response.content.map((block: any) => (typeof block.text === 'string' ? block.text : '')).join('')
    : '';

  return text;
}

function aggregateExtractedText(files: any[], limit: number = 8000): string {
  let combined = '';
  for (const file of files) {
    if (file.extractedText) {
      combined += `--- Content from ${file.name} ---\n${file.extractedText}\n\n`;
    }
  }
  return combined.length > limit ? combined.substring(0, limit) + '...' : combined;
}

async function generateChatReply(params: {
  model: SupportedModel;
  systemInstruction: string;
  history: any[];
  message: string;
  contextLabel: string;
  attachments?: any[];
}) {
  const provider = MODEL_PROVIDERS[params.model];
  
  if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Please add it to your environment variables.');
  }

  // Claude model handling requires ANTHROPIC_API_KEY.
  if (provider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Claude API key needed for Claude model handling.');
  }

  try {
    if (provider === 'gemini') {
      const text = await runGemini(params.model, params.systemInstruction, params.history, params.message, params.attachments);
      if (text !== null) return text;
    } else {
      // Claude model handling requires ANTHROPIC_API_KEY.
      const text = await runClaude(params.model, params.systemInstruction, params.history, params.message, params.attachments);
      if (text !== null) return text;
    }
  } catch (error: any) {
    console.error(`${provider} chat error:`, error);

    // Specific handling for HTTP 429 quota errors (Gemini)
    const statusCode = error?.status || error?.statusCode || error?.error?.code || error?.response?.status;
    if (statusCode === 429) {
      // Throw a clear, user-facing message so frontend can display it in the chat bubble
      throw new Error('Gemini API quota exceeded. Your free daily limit has been reached. Please wait until tomorrow or upgrade your plan at aistudio.google.com.');
    }

    throw error;
  }

  return 'No response generated from AI.';
}

async function extractTextFromBase64(dataBase64: string, originalName: string): Promise<string> {
  const extension = path.extname(originalName).toLowerCase();
  const buffer = Buffer.from(dataBase64.split(',')[1] || dataBase64, 'base64');
  
  try {
    if (extension === '.pdf') {
      return new Promise((resolve, reject) => {
        let text = '';
        new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
          if (err) {
            console.error(`[Extraction-Base64] PDF Error:`, err);
            reject(err);
          }
          else if (!item) {
            console.log(`[Extraction-Base64] PDF extracted: ${text.length} chars`);
            resolve(text.trim());
          }
          else if (item.text) text += item.text + ' ';
        });
      });
    } else if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: buffer });
      console.log(`[Extraction-Base64] DOCX extracted: ${result.value?.length || 0} chars`);
      return result.value;
    }
  } catch (error) {
    console.error(`[Extraction-Base64] Failed for ${originalName}:`, error);
  }
  return '';
}

app.post('/api/chat/global', async (req, res) => {
  try {
    const { message, history = [], context, model = 'gemini-2.5-flash', attachments = [] } = req.body;
    const selectedModel = safeModel(model);
    const provider = MODEL_PROVIDERS[selectedModel];
    
    const workspace = await Workspace.findOne({ id: 'default-user-workspace' });
    let allExtractedText = '';
    if (workspace && workspace.modules) {
      const allFiles = workspace.modules.flatMap((m: any) => 
        (m.files || []).map((f: any) => ({ 
          name: `${m.title} > ${f.name}`, 
          extractedText: f.extractedText 
        }))
      );
      allExtractedText = aggregateExtractedText(allFiles);
    }

    // Process chat attachments (extract text from documents)
    let attachmentContext = '';
    for (const att of attachments) {
      if (!att.type.startsWith('image/')) {
        const text = await extractTextFromBase64(att.data, att.name);
        if (text) {
          attachmentContext += `--- Attachment: ${att.name} ---\n${text}\n\n`;
        }
      }
    }

    console.log(`[RAG-Global] Injected context length: ${allExtractedText.length}, Attachment context: ${attachmentContext.length}`);

    const systemInstruction = GLOBAL_CHAT_SYSTEM_PROMPT + `\n\nApp context:\n${JSON.stringify(context, null, 2)}\n\nExtracted text from student materials:\n${allExtractedText}\n\nConversation transcript:\n${transcript(history)}`;

    const text = await generateChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message: attachmentContext ? `${message}\n\n[Attached Files Content]\n${attachmentContext}` : message,
      attachments,
      contextLabel: `global assistant (${provider})`,
    });

    res.json({ role: 'model', text });
  } catch (error: any) {
    console.error('Global Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function generateTitleFromMessage(message: string, model: SupportedModel): Promise<string> {
  const systemInstruction = "Generate a very short, 2-5 word title for a chat session based on the user's first message. Return ONLY the title text, no quotes or punctuation.";
  try {
    const title = await generateChatReply({
      model,
      systemInstruction,
      history: [],
      message,
      contextLabel: 'title generator',
    });
    return title.replace(/["'""'“”]/g, '').trim();
  } catch (error) {
    return 'New Chat';
  }
}

app.post('/api/chat/module', async (req, res) => {
  try {
    const { message, moduleId, moduleName, files, history = [], model = 'gemini-2.5-flash', attachments = [], generateTitle = false } = req.body;
    const selectedModel = safeModel(model);
    const provider = MODEL_PROVIDERS[selectedModel];

    let extractedText = '';
    let dbModule: any = null;
    let workspace: any = null;

    if (moduleId) {
      workspace = await Workspace.findOne({ id: 'default-user-workspace' });
      dbModule = workspace?.modules.find((m: any) => m.id === moduleId);
      if (dbModule && dbModule.files) {
        extractedText = aggregateExtractedText(dbModule.files);
        console.log(`[RAG-Chat] Module fetched: ${moduleName} (${moduleId})`);
        console.log(`[RAG-Chat] Files found: ${dbModule.files.length}`);
        console.log(`[RAG-Chat] extractedText found: ${extractedText.length} characters`);
      } else {
        console.log(`[RAG-Chat] Module ${moduleId} not found in DB or has no files.`);
      }
    }

    if (!extractedText && Array.isArray(files)) {
      extractedText = aggregateExtractedText(files);
      console.log(`[RAG-Chat] Falling back to frontend-provided files. Context length: ${extractedText.length}`);
    }

    let attachmentContext = '';
    let newFilesSaved = 0;
    for (const att of attachments) {
      const isDoc = att.type === 'application/pdf' || att.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (isDoc) {
        const text = await extractTextFromBase64(att.data, att.name);
        if (text) {
          attachmentContext += `--- Attachment: ${att.name} ---\n${text}\n\n`;
          if (dbModule) {
            const alreadyExists = dbModule.files.some((f: any) => f.name === att.name && f.size === (att.size || 0));
            if (!alreadyExists) {
              dbModule.files.push({ id: uuidv4(), name: att.name, size: att.size || 0, extractedText: text, uploadedAt: new Date() });
              newFilesSaved++;
            }
          }
        }
      }
    }

    if (newFilesSaved > 0 && workspace) {
      await workspace.save();
      console.log(`[RAG-Chat] Saved ${newFilesSaved} new attachments to module files.`);
    }

    const transcriptText = transcript(history);
    const systemInstruction = MODULE_CHAT_SYSTEM_PROMPT.replace('%%MODULE_NAME%%', moduleName) + `\n\nThe following text is from the student's uploaded lecture materials:\n${extractedText}\n\nConversation transcript:\n${transcriptText}`;

    console.log(`[RAG-Chat] System prompt built. First 200 chars: ${systemInstruction.substring(0, 200).replace(/\n/g, ' ')}...`);

    const textPromise = generateChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message: attachmentContext ? `${message}\n\n[Attached Files Content]\n${attachmentContext}` : message,
      attachments,
      contextLabel: `module assistant for ${moduleName} (${provider})`,
    });

    let titlePromise = Promise.resolve('');
    if (generateTitle) titlePromise = generateTitleFromMessage(message, selectedModel);

    const [text, title] = await Promise.all([textPromise, titlePromise]);

    const response: any = { role: 'model', text };
    if (title) response.title = title;
    if (newFilesSaved > 0) response.files = dbModule?.files;

    res.json(response);
  } catch (error: any) {
    console.error('Module Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  const extension = path.extname(originalName).toLowerCase();
  console.log(`[Extraction] Processing ${originalName} (ext: ${extension})`);
  try {
    if (extension === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      return new Promise((resolve, reject) => {
        let text = '';
        new PdfReader().parseBuffer(dataBuffer, (err: any, item: any) => {
          if (err) reject(err);
          else if (!item) {
            console.log(`[Extraction] PDF text length: ${text.length}`);
            resolve(text.trim());
          }
          else if (item.text) text += item.text + ' ';
        });
      });
    } else if (extension === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`[Extraction] DOCX text length: ${result.value?.length || 0}`);
      return result.value;
    }
  } catch (error) {
    console.error(`[Extraction] Failed for ${originalName}:`, error);
  }
  return '';
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('[Upload] No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(`[Upload] File received: ${req.file.originalname} (${req.file.size} bytes)`);

    const extractedText = await extractTextFromFile(req.file.path, req.file.originalname);
    console.log(`[Upload] Text extracted: ${extractedText.length} characters`);

    // Note: Saving to MongoDB happens via frontend calling PATCH /api/data/modules/:id
    console.log(`[Upload] Returning data to frontend for persistence.`);

    res.json({
      id: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      geminiFileUri: 'mock-uri-' + req.file.filename,
      extractedText: extractedText
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Data persistence routes
app.use('/api/data', dataRoutes);

connectDB();
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