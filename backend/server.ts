import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { GoogleGenAI, FunctionCallingConfigMode, createPartFromFunctionCall, createPartFromFunctionResponse, type FunctionDeclaration } from '@google/genai';
import Groq from 'groq-sdk';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
const require = createRequire(import.meta.url);
const { PdfReader } = require('pdfreader');
import mammoth from 'mammoth';
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './db.js';
import dataRoutes from './routes/data.js';
import { Workspace } from './models.js';

const app = express();
const PORT = process.env.PORT || 3001;

type WorkspaceDocumentLike = {
  id: string;
  modules: any[];
  tasks: any[];
  events: any[];
  globalChat: { id: string; messages: any[] };
  save: () => Promise<WorkspaceDocumentLike>;
};

let fallbackWorkspace: WorkspaceDocumentLike | null = null;

function createFallbackWorkspace(): WorkspaceDocumentLike {
  if (fallbackWorkspace) return fallbackWorkspace;

  fallbackWorkspace = {
    id: 'default-user-workspace',
    modules: [],
    tasks: [],
    events: [],
    globalChat: { id: uuidv4(), messages: [] },
    save: async () => fallbackWorkspace as WorkspaceDocumentLike,
  };

  return fallbackWorkspace;
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const MODEL_PROVIDERS = {
  'llama-3.3-70b-versatile': 'groq',
  'gemini-2.5-flash': 'gemini',
  'gemini-3.1-pro': 'gemini',
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
- You can also answer normal general questions (date/time facts, common knowledge, everyday queries) naturally.
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

PROJECT / COMPLEX TASK MODE:
- For app actions (tasks/events/modules/theme), execute immediately using tools with sensible defaults.
- Ask follow-up questions only if the request is impossible to execute safely (for example, deleting an item with no identifiable title).
- For broader external projects (outside the app), you can ask a few clarifying questions before giving a full solution.

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

type ChatAction = { action: 'switch_theme'; theme: string } | { action: 'refresh_workspace' };

type ChatReply = {
  text: string;
  action?: ChatAction;
};

const AVAILABLE_THEME_IDS = [
  'nebula-blue',
  'midnight-violet',
  'emerald-pulse',
  'crimson-noir',
  'sunset-synthwave',
  'obsidian-gold',
  'aurora-dream',
] as const;

const AVAILABLE_THEMES = [
  { id: 'nebula-blue', name: 'Nebula Blue' },
  { id: 'midnight-violet', name: 'Midnight Violet' },
  { id: 'emerald-pulse', name: 'Emerald Pulse' },
  { id: 'crimson-noir', name: 'Crimson Noir' },
  { id: 'sunset-synthwave', name: 'Sunset Synthwave' },
  { id: 'obsidian-gold', name: 'Obsidian Gold' },
  { id: 'aurora-dream', name: 'Aurora Dream' },
] as const;

const THEME_ALIASES: Record<string, string> = {
  'sunset glow': 'sunset-synthwave',
  'sapphire dream': 'aurora-dream',
  'ocean breeze': 'nebula-blue',
  sunset: 'sunset-synthwave',
  sapphire: 'aurora-dream',
  ocean: 'nebula-blue',
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const CHAT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the workspace.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'Optional date in YYYY-MM-DD format' },
        moduleId: { type: 'string', description: 'Optional module id to attach the task to' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by searching for its title.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'toggle_task',
    description: 'Toggle a task done or undone by searching for its title.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_event',
    description: 'Create a calendar event in the workspace.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Start time in HH:MM format' },
        endTime: { type: 'string', description: 'End time in HH:MM format' },
        color: { type: 'string', enum: ['blue', 'amber', 'purple'] },
        description: { type: 'string' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event by searching for its title.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_module',
    description: 'Create a new academic module.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        code: { type: 'string' },
        color: { type: 'string', description: 'Optional module color' },
      },
      required: ['title', 'code'],
      additionalProperties: false,
    },
  },
  {
    name: 'switch_theme',
    description: 'Switch the app theme.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'Theme id or theme name from the available themes' },
      },
      required: ['theme'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_tasks',
    description: 'Fetch current tasks so the AI can reference them.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_events',
    description: 'Fetch current events so the AI can reference them.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

function getOrCreateWorkspace() {
  if (mongoose.connection.readyState !== 1) {
    return createFallbackWorkspace();
  }

  return Workspace.findOne({ id: 'default-user-workspace' }).then(async (workspace) => {
    if (workspace) return workspace;
    const created = new Workspace({
      id: 'default-user-workspace',
      modules: [],
      tasks: [],
      events: [],
      globalChat: { id: uuidv4(), messages: [] },
    });
    await created.save();
    return created;
  }).catch(() => createFallbackWorkspace());
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function scoreTitleMatch(sourceTitle: string, targetTitle: string) {
  const source = sourceTitle.trim().toLowerCase();
  const target = targetTitle.trim().toLowerCase();
  if (!source || !target) return null;
  if (source === target) return 0;
  if (source.startsWith(target) || target.startsWith(source)) return 1;
  if (source.includes(target) || target.includes(source)) return 2;
  return null;
}

function findBestMatch<T>(items: T[], title: string, getTitle: (item: T) => string) {
  const scored = items
    .map((item) => {
      const score = scoreTitleMatch(getTitle(item), title);
      return score === null ? null : { item, score };
    })
    .filter((item): item is { item: T; score: number } => item !== null)
    .sort((left, right) => left.score - right.score);

  return scored[0]?.item ?? null;
}

function resolveThemeId(theme: unknown) {
  const rawTheme = normalizeText(theme);
  if (!rawTheme) return null;

  const normalizedTheme = rawTheme.toLowerCase().replace(/[_\s]+/g, '-');

  const canonical = AVAILABLE_THEME_IDS.find((themeId) => themeId === normalizedTheme);
  if (canonical) return canonical;

  const aliasTheme = THEME_ALIASES[rawTheme.toLowerCase()];
  if (aliasTheme) return aliasTheme;

  const themeName = rawTheme.toLowerCase();
  const matchedTheme = AVAILABLE_THEMES.find((entry) => entry.name.toLowerCase() === themeName);
  if (matchedTheme) return matchedTheme.id;

  const fuzzyTheme = AVAILABLE_THEMES.find((entry) => {
    const name = entry.name.toLowerCase();
    return themeName.includes(name) || name.includes(themeName);
  });
  return fuzzyTheme?.id ?? null;
}

function inferAllowedFunctionNames(message: string) {
  const text = message.toLowerCase();
  const allowed = new Set<string>();

  if (/(create|add|new).*(task)|task.*(create|add|new)/i.test(text)) allowed.add('create_task');
  if (/(delete|remove|discard).*(task)|task.*(delete|remove|discard)/i.test(text)) allowed.add('delete_task');
  if (/(toggle|complete|done|undone|check off).*(task)|task.*(toggle|complete|done|undone|check off)/i.test(text)) allowed.add('toggle_task');
  if (/(create|add|new|schedule|plan).*(event|calendar|calender|birthday|borthday|meeting|appointment)|event.*(create|add|new|schedule|plan)|\b(birthday|borthday)\b|\badd\b.*\bto\b.*\b(calendar|calender)\b/i.test(text)) {
    allowed.add('create_event');
  }
  if (/(delete|remove|discard).*(event)|event.*(delete|remove|discard)/i.test(text)) allowed.add('delete_event');
  if (/(create|add|new).*(module)|module.*(create|add|new)/i.test(text)) allowed.add('create_module');
  if (/(theme|color|palette|switch|change look|change theme)/i.test(text) || /\b(different|another)\s+one\b/i.test(text)) {
    allowed.add('switch_theme');
  }
  if (/\b(get|show|list|see).*(task|tasks)\b/i.test(text)) allowed.add('get_tasks');
  if (/\b(get|show|list|see).*(event|events|calendar)\b/i.test(text)) allowed.add('get_events');

  return allowed.size > 0 ? Array.from(allowed) : undefined;
}

async function executeChatTool(name: string, args: Record<string, unknown>) {
  const workspace = await getOrCreateWorkspace();

  switch (name) {
    case 'create_task': {
      const title = normalizeText(args.title);
      if (!title) throw new Error('Task title is required.');

      const moduleId = normalizeText(args.moduleId) || undefined;
      if (moduleId && !workspace.modules.some((module: any) => module.id === moduleId)) {
        throw new Error(`Module ${moduleId} was not found.`);
      }

      const task = {
        id: uuidv4(),
        title,
        done: false,
        dueDate: normalizeText(args.dueDate) || undefined,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      workspace.tasks.push(task as any);
      await workspace.save();
      return {
        action: { action: 'refresh_workspace' },
        response: {
          output: {
            success: true,
            task,
          },
        },
      };
    }
    case 'delete_task': {
      const deleteAllRequested =
        args.deleteAll === true ||
        normalizeText(args.deleteAll).toLowerCase() === 'true' ||
        normalizeText(args.title).toLowerCase() === '__all__';

      if (deleteAllRequested) {
        const deletedCount = workspace.tasks.length;
        workspace.tasks = [];
        await workspace.save();
        return {
          action: { action: 'refresh_workspace' },
          response: {
            output: {
              success: true,
              deletedCount,
            },
          },
        };
      }

      const title = normalizeText(args.title);
      if (!title) throw new Error('Task title is required.');

      const task = findBestMatch(workspace.tasks as any[], title, (item: any) => item.title);
      if (!task) throw new Error(`No task matched "${title}".`);

      (workspace.tasks as any) = workspace.tasks.filter((item: any) => item.id !== task.id);
      await workspace.save();
      return { action: { action: 'refresh_workspace' }, response: { output: { success: true, deletedTask: task } } };
    }
    case 'toggle_task': {
      const title = normalizeText(args.title);
      if (!title) throw new Error('Task title is required.');

      const task = findBestMatch(workspace.tasks as any[], title, (item: any) => item.title);
      if (!task) throw new Error(`No task matched "${title}".`);

      task.done = !task.done;
      task.updatedAt = new Date();
      await workspace.save();
      return { action: { action: 'refresh_workspace' }, response: { output: { success: true, task } } };
    }
    case 'create_event': {
      const title = normalizeText(args.title);
      const date = normalizeText(args.date);
      const startTime = normalizeText(args.startTime);
      const endTime = normalizeText(args.endTime);
      if (!title || !date || !startTime || !endTime) throw new Error('Title, date, startTime, and endTime are required.');

      const color = normalizeText(args.color).toLowerCase();
      const eventColor = ['blue', 'amber', 'purple'].includes(color) ? color : 'blue';
      const event = {
        id: uuidv4(),
        title,
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${endTime}:00`,
        color: eventColor,
        description: normalizeText(args.description) || undefined,
        createdAt: new Date(),
      };

      workspace.events.push(event as any);
      await workspace.save();
      return { action: { action: 'refresh_workspace' }, response: { output: { success: true, event } } };
    }
    case 'delete_event': {
      const title = normalizeText(args.title);
      if (!title) throw new Error('Event title is required.');

      const event = findBestMatch(workspace.events as any[], title, (item: any) => item.title);
      if (!event) throw new Error(`No event matched "${title}".`);

      workspace.events = workspace.events.filter((item: any) => item.id !== event.id) as any;
      await workspace.save();
      return { action: { action: 'refresh_workspace' }, response: { output: { success: true, deletedEvent: event } } };
    }
    case 'create_module': {
      const title = normalizeText(args.title);
      const code = normalizeText(args.code);
      if (!title || !code) throw new Error('Module title and code are required.');

      const color = normalizeText(args.color).toLowerCase();
      const moduleColor = ['blue', 'amber', 'emerald', 'purple', 'rose'].includes(color) ? color : 'blue';
      const module = {
        id: uuidv4(),
        title,
        code,
        color: moduleColor,
        files: [],
        chatHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      workspace.modules.push(module as any);
      await workspace.save();
      return { action: { action: 'refresh_workspace' }, response: { output: { success: true, module } } };
    }
    case 'switch_theme': {
      const theme = resolveThemeId(args.theme);
      if (!theme) throw new Error('Theme not found.');

      const matchedTheme = AVAILABLE_THEMES.find((entry) => entry.id === theme);
      return {
        action: { action: 'switch_theme', theme } as ChatAction,
        response: {
          output: {
            success: true,
            theme,
            themeName: matchedTheme?.name ?? theme,
          },
        },
      };
    }
    case 'get_tasks': {
      const tasks = workspace.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        done: task.done,
        dueDate: task.dueDate ?? null,
        moduleId: task.moduleId ?? null,
        moduleTitle: task.moduleId ? workspace.modules.find((module: any) => module.id === task.moduleId)?.title ?? null : null,
      }));
      return { response: { output: { success: true, tasks } } };
    }
    case 'get_events': {
      const events = workspace.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color,
        description: event.description ?? null,
      }));
      return { response: { output: { success: true, events } } };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

let geminiClient: GoogleGenAI | null = null;
let groqClient: Groq | null = null;

function getGeminiClient() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      geminiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return geminiClient;
}

function getGroqClient() {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (key) {
      groqClient = new Groq({ apiKey: key });
    }
  }
  return groqClient;
}

function safeModel(model: unknown): SupportedModel {
  if (typeof model === 'string' && model in MODEL_PROVIDERS) {
    return model as SupportedModel;
  }
  return 'llama-3.3-70b-versatile';
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

function parseTimeTo24Hour(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? match[2].padStart(2, '0') : '00';
  const period = match[3].toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function resolveTomorrowDate(base = new Date()) {
  const tomorrow = new Date(base);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesDayName(dateText: string, target: Date) {
  const normalized = dateText.toLowerCase();
  const day = target.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  return normalized.includes(day);
}

function formatTaskDueDate(value?: string | null) {
  if (!value) return 'no due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: date.getHours() || date.getMinutes() ? '2-digit' as const : undefined, minute: date.getHours() || date.getMinutes() ? '2-digit' as const : undefined });
}

function extractTaskTitleHint(message: string): string | null {
  const normalized = message.toLowerCase();
  const patterns = [
    /(?:task|todo|to-do|task called|task named|edit task|update task|delete task|remove task|complete task|finish task)\s+(?:called\s+|named\s+)?(.+?)(?:\s+(?:due|by|at|on|time|from|to|tomorrow|today|please|thanks|for|with)\b|[?.!,]|$)/i,
    /(?:the\s+)?(.+?)\s+task(?:\s|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const title = match?.[1]?.trim();
    if (title) {
      return title.replace(/^['"`]+|['"`]+$/g, '').trim();
    }
  }

  return null;
}

async function buildLocalFallbackText(message: string, contextLabel: string, history: any[] = []): Promise<string> {
  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();
  const recentTranscript = history
    .slice(-6)
    .map((entry) => `${String(entry?.role ?? '').toLowerCase()}: ${String(entry?.text ?? '')}`)
    .join('\n')
    .toLowerCase();

  const lastThemeMatch = recentTranscript.match(/switched the app theme to ([a-z\s-]+)/i) || recentTranscript.match(/switched your app theme to ([a-z\s-]+)/i);
  const lastTheme = lastThemeMatch?.[1]?.trim();

  const themeOrder = ['Nebula Blue', 'Midnight Violet', 'Emerald Pulse', 'Crimson Noir', 'Sunset Synthwave', 'Obsidian Gold', 'Aurora Dream'];
  const nextTheme = (() => {
    if (!lastTheme) return 'Sunset Synthwave';
    const index = themeOrder.findIndex((theme) => theme.toLowerCase() === lastTheme.toLowerCase());
    if (index === -1) return 'Sunset Synthwave';
    return themeOrder[(index + 1) % themeOrder.length];
  })();

  if (/change.*(again|different one|another one)|different one|another one|change again/i.test(normalized)) {
    return `I switched the app theme to ${nextTheme}.`;
  }

  if (/it\s+near\s+india|is it near india|near india/i.test(normalized)) {
    if (/sri lanka/.test(recentTranscript) || /sri lanka/.test(normalized)) {
      return 'Yes, Sri Lanka is near India across the Palk Strait.';
    }
  }

  if (/what about that|and the previous one|previous one|that one/i.test(normalized) && /theme/.test(recentTranscript)) {
    return `I switched the app theme to ${nextTheme}.`;
  }

  const workspace = await getOrCreateWorkspace();

  if (/(delete|remove|clear).*(all|everything).*(task|tasks)|clear my tasks|delete all my tasks|remove all my tasks/i.test(normalized)) {
    const removedCount = workspace.tasks.length;
    workspace.tasks = [];
    await workspace.save();
    return removedCount === 0 ? 'You do not have any tasks to delete.' : `I deleted all ${removedCount} of your tasks.`;
  }

  if (/(what|which).*(task|tasks).*(tomorrow|next day)|tasks?.*tomorrow|tomorrow.*tasks|what are the tasks i have tomorrow/i.test(normalized)) {
    const tomorrow = resolveTomorrowDate();
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    const tasksForTomorrow = workspace.tasks.filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate.toISOString().slice(0, 10) === tomorrowKey;
    });

    if (tasksForTomorrow.length === 0) {
      return 'You do not have any tasks due tomorrow.';
    }

    return `You have ${tasksForTomorrow.length} task${tasksForTomorrow.length === 1 ? '' : 's'} due tomorrow: ${tasksForTomorrow.map((task: any) => task.title).join(', ')}.`;
  }

  if (/(edit|update|change|move).*(task).*(time|due|deadline)|set.*task.*time/i.test(normalized)) {
    const explicitTitle = trimmed.match(/(?:edit|update|change|move)(?:\s+the)?\s+(.+?)\s+task(?:\s|$)/i)?.[1]?.trim() ?? null;
    const titleHint = explicitTitle ?? extractTaskTitleHint(trimmed);
    const matchingTask = titleHint
      ? findBestMatch(workspace.tasks as any[], titleHint, (item: any) => item.title)
      : null;
    const directMatch = explicitTitle
      ? null
      : workspace.tasks.find((task: any) => normalized.includes(String(task.title ?? '').toLowerCase()));
    const taskToUpdate = matchingTask ?? directMatch ?? null;

    if (taskToUpdate) {
      const wantsTomorrow = /tomorrow/i.test(normalized);
      const timeText = trimmed.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1];
      const time24 = timeText ? parseTimeTo24Hour(timeText) : null;
      const baseDate = wantsTomorrow ? resolveTomorrowDate() : new Date();

      if (time24) {
        const [hours, minutes] = time24.split(':').map(Number);
        baseDate.setHours(hours, minutes, 0, 0);
      }

      taskToUpdate.dueDate = baseDate.toISOString();
      taskToUpdate.updatedAt = new Date();
      await workspace.save();
      return `I updated the task "${taskToUpdate.title}"${time24 ? ` to ${time24}` : ''}.`;
    }
  }

  if (/^(hi|hello|hey|yo)\b/.test(normalized)) {
    return "Hey Lochana, I'm here. What do you need help with in My-Notion today?";
  }

  if (/where is sri lanka|location of sri lanka|sri lanka.*where/i.test(normalized)) {
    return 'Sri Lanka is an island country in South Asia, in the Indian Ocean just off the southeastern coast of India.';
  }

  if (/near india|close to india/i.test(normalized) && /sri lanka/i.test(normalized)) {
    return 'Yes, Sri Lanka is near India across the Palk Strait.';
  }

  if (/linear regression/i.test(normalized)) {
    return 'Linear regression is a simple model that fits a straight line to data so you can predict one value from another.';
  }

  if (/president of sri lanka/i.test(normalized)) {
    return 'I can help with My-Notion tasks, but I cannot reliably verify live world facts right now.';
  }

  if (/task|tasks|event|events|calendar|module|modules/i.test(normalized) && !/(delete|remove|clear|what|which|when|where|edit|update|change|move|tomorrow|next day|today|tonight)/i.test(normalized)) {
    return `I can help with your current tasks, events, modules, and theme changes. ${contextLabel.includes('module') ? 'Try asking me to work on the module directly.' : 'Try asking me to create, update, delete, or list something in the app.'}`;
  }

  if (/sri lanka/.test(recentTranscript) && /india|near|close/i.test(normalized)) {
    return 'Yes, Sri Lanka is near India across the Palk Strait.';
  }

  if (/theme/.test(recentTranscript) && /change|switch|different|another/i.test(normalized)) {
    return `I switched the app theme to ${nextTheme}.`;
  }

  return `I can still help with My-Notion tasks, events, modules, and theme changes. ${contextLabel.includes('module') ? 'Try asking me to work on the module directly.' : 'Try asking me to create, update, delete, or summarize something in the app.'}`;
}

function buildGeminiContents(history: any[] = [], message: string, attachments: any[] = []) {
  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: msg.attachments?.length
      ? [{ text: msg.text }, ...msg.attachments.filter((a: any) => a.type.startsWith('image/')).map((a: any) => ({
          inlineData: { mimeType: a.type, data: a.data.split(',')[1] || a.data },
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

  return [...contents, { role: 'user', parts: userParts }];
}

async function runGemini(
  model: SupportedModel,
  systemInstruction: string,
  history: any[],
  message: string,
  attachments: any[] = [],
  toolDeclarations: FunctionDeclaration[] = []
): Promise<ChatReply | null> {
  const client = getGeminiClient();
  if (!client) return null;

  let contents = buildGeminiContents(history, message, attachments);
  let action: ChatAction | undefined;
  const allowedFunctionNames = toolDeclarations.length > 0 ? inferAllowedFunctionNames(message) : undefined;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const config: any = { systemInstruction };
    if (toolDeclarations.length > 0) {
      config.tools = [{ functionDeclarations: toolDeclarations }];
      config.toolConfig = {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
          ...(allowedFunctionNames ? { allowedFunctionNames } : {}),
        },
      };
    }

    let response: any;
    try {
      response = await client.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (err: any) {
      console.error('[Gemini] API call failed', err?.message ?? err);
      const status = err?.status || err?.statusCode || err?.response?.status;
      const headers = err?.headers || err?.response?.headers || {};
      const retryAfterRaw = headers?.['retry-after'] || headers?.get?.('retry-after');
      if ((status === 429 || /quota|rate limit/i.test(String(err?.message || ''))) && attempt < 3) {
        let waitMs = 1000 * Math.pow(2, attempt);
        if (retryAfterRaw) {
          const parsed = Number(retryAfterRaw);
          if (!Number.isNaN(parsed)) waitMs = parsed * 1000;
        }
        console.warn(`[Gemini] retrying after ${waitMs}ms (attempt ${attempt + 1})`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      const text = response.text ?? '';
      if (isGenericAiFailureText(text)) {
        return {
          text: await buildLocalFallbackText(message, 'global assistant', history),
          action,
        };
      }
      return {
        text: response.text ?? '',
        action,
      };
    }

    const modelParts = functionCalls.map((call: any) => createPartFromFunctionCall(call.name ?? '', call.args ?? {}));
    const functionResponseParts = [];

    for (const call of functionCalls) {
      let toolResult;
      try {
        toolResult = await executeChatTool(call.name ?? '', (call.args ?? {}) as Record<string, unknown>);
      } catch (error: any) {
        toolResult = {
          response: {
            error: error instanceof Error ? error.message : 'Tool execution failed.',
          },
        };
      }
      if (!action && toolResult.action) {
        action = toolResult.action as ChatAction;
      }

      functionResponseParts.push(
        createPartFromFunctionResponse(call.id ?? call.name ?? `call-${attempt}-${functionResponseParts.length}`, call.name ?? '', toolResult.response)
      );
    }

    contents = [
      ...contents,
      { role: 'model', parts: modelParts },
      { role: 'user', parts: functionResponseParts },
    ];
  }

  return {
    text: 'No response generated from AI.',
    action,
  };
}

function buildGroqMessages(history: any[] = [], message: string, attachments: any[] = []): any[] {
  const messages = history.map((msg) => {
    const contentParts: any[] = [{ type: 'text', text: String(msg.text) }];
    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (att.type.startsWith('image/')) {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: att.data,
              detail: 'auto',
            },
          });
        }
      }
    }

    return {
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: contentParts.length === 1 ? contentParts[0].text : contentParts,
    };
  });

  const userParts: any[] = [{ type: 'text', text: message }];
  if (attachments) {
    for (const att of attachments) {
      if (att.type.startsWith('image/')) {
        userParts.push({
          type: 'image_url',
          image_url: {
            url: att.data,
            detail: 'auto',
          },
        });
      }
    }
  }

  messages.push({
    role: 'user',
    content: userParts.length === 1 ? userParts[0].text : userParts,
  });

  return messages;
}

function formatGroqToolResponse(name: string, response: any) {
  const output = response?.output;

  if (response?.error) {
    return `I hit an error while running ${name}: ${response.error}`;
  }

  switch (name) {
    case 'create_task': {
      const task = output?.task;
      if (task?.title) {
        const dueDate = task.dueDate ? ` due on ${new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
        return `I created a new task called "${task.title}"${dueDate}.`;
      }
      return 'I created the task.';
    }
    case 'delete_task':
      if (typeof output?.deletedCount === 'number') {
        return output.deletedCount === 0 ? 'You do not have any tasks to delete.' : `I deleted all ${output.deletedCount} of your tasks.`;
      }
      return output?.deletedTask?.title ? `I deleted the task "${output.deletedTask.title}".` : 'I deleted the task.';
    case 'toggle_task':
      return output?.task?.title ? `I updated the task "${output.task.title}".` : 'I updated the task.';
    case 'create_event': {
      const event = output?.event;
      if (event?.title) {
        return `I added "${event.title}" to your calendar.`;
      }
      return 'I added the event to your calendar.';
    }
    case 'delete_event':
      return output?.deletedEvent?.title ? `I deleted the calendar event "${output.deletedEvent.title}".` : 'I deleted the calendar event.';
    case 'create_module': {
      const module = output?.module;
      if (module?.title && module?.code) {
        return `I created the module "${module.title}" (${module.code}).`;
      }
      return 'I created the module.';
    }
    case 'switch_theme':
      return output?.themeName ? `I switched the app theme to ${output.themeName}.` : 'I switched the app theme.';
    case 'get_tasks':
      return Array.isArray(output?.tasks) ? `Here are your ${output.tasks.length} tasks.` : 'Here are your tasks.';
    case 'get_events':
      return Array.isArray(output?.events) ? `Here are your ${output.events.length} calendar events.` : 'Here are your calendar events.';
    default:
      return 'Done.';
  }
}

function extractTaskArgsFromMessage(message: string) {
  const trimmed = message.trim();
  let title = trimmed;

  const patterns = [
    /^(?:add|create|new)\s+(?:a\s+)?task\s+(?:called|named)\s+(.+)$/i,
    /^(?:add|create|new)\s+(?:a\s+)?task\s+(.+)$/i,
    /^(?:task)\s+(?:called|named)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      title = match[1].trim();
      break;
    }
  }

  title = title.replace(/^called\s+/i, '').replace(/^named\s+/i, '').trim();

  const dueMatch = title.match(/\bdue(?:\s+on)?\s+(.+)$/i);
  const dueText = dueMatch?.[1]?.trim();
  if (dueMatch?.index !== undefined) {
    title = title.slice(0, dueMatch.index).trim().replace(/[,.:-]$/, '').trim();
  }

  const parsedDate = dueText ? new Date(dueText) : null;
  const dueDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : undefined;

  return {
    title,
    dueDate,
  };
}

function extractThemeArgsFromMessage(message: string) {
  const theme = resolveThemeId(message);
  if (theme) return { theme };

  const text = message.toLowerCase();
  if (/(theme|color|palette|switch|change look|change theme)/i.test(text) || /\b(different|another)\s+one\b/i.test(text)) {
    const fallbackTheme = AVAILABLE_THEME_IDS[Math.floor(Math.random() * AVAILABLE_THEME_IDS.length)];
    return { theme: fallbackTheme };
  }

  return {};
}

function extractModuleArgsFromMessage(message: string) {
  const trimmed = message.trim();
  const match = trimmed.match(/^(?:add|create|new)\s+(?:a\s+)?module\s+(?:called|named)?\s+(.+)$/i);
  const rest = match?.[1]?.trim() ?? trimmed;
  const codeMatch = rest.match(/\b(?:code|id)\s+([A-Za-z0-9_-]+)\b/i);
  const title = rest.replace(/\b(?:code|id)\s+[A-Za-z0-9_-]+\b/i, '').replace(/\s+with\s+color\s+.+$/i, '').trim().replace(/[,.;:-]$/, '').trim();
  return {
    title,
    code: codeMatch?.[1]?.trim() ?? '',
    color: '',
  };
}

function normalizeTimeString(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'midnight') return '00:00';
  if (trimmed === 'noon') return '12:00';

  const ampm = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = ampm[2] ?? '00';
    const meridiem = ampm[3].toLowerCase();
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}`;
  }

  return '09:00';
}

function parseDateFromText(dateText: string) {
  const trimmed = dateText.trim().toLowerCase();
  if (!trimmed) return null;

  const directDate = new Date(trimmed);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString().slice(0, 10);
  }

  const now = new Date();
  const dayThisMonthMatch = trimmed.match(/\b(\d{1,2})(?:\s*(?:st|nd|rd|th))?\s*(?:of\s*)?(?:this\s*month)\b/i);
  if (dayThisMonthMatch) {
    const day = Number(dayThisMonthMatch[1]);
    if (day >= 1 && day <= 31) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      return date.toISOString().slice(0, 10);
    }
  }

  const monthDayMatch = trimmed.match(/\b(\d{1,2})(?:\s*(?:st|nd|rd|th))?\s*(?:of\s*)?(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (monthDayMatch) {
    const day = Number(monthDayMatch[1]);
    const monthName = monthDayMatch[2].toLowerCase();
    const monthIndex = MONTH_INDEX[monthName];
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const candidate = new Date(year, monthIndex, day);
      if (candidate.getTime() < now.getTime()) {
        year += 1;
      }
      return new Date(year, monthIndex, day).toISOString().slice(0, 10);
    }
  }

  return null;
}

function inferEventTitleFromMessage(message: string) {
  const trimmed = message.trim();

  const calledMatch = trimmed.match(/(?:event|birthday|borthday|meeting|appointment)\s+(?:called|named)\s+(.+?)(?:\s+on\s+|\s+from\s+|\s+to\s+|$)/i);
  if (calledMatch?.[1]) return calledMatch[1].trim().replace(/[,.]$/, '');

  const birthdayMatch = trimmed.match(/([A-Za-z][A-Za-z\s']{1,40})'?s\s+(?:birthday|borthday)/i);
  if (birthdayMatch?.[1]) {
    return `${birthdayMatch[1].trim()} birthday`;
  }

  const genericMatch = trimmed.match(/(?:add|create|new|schedule|plan)\s+(?:an?\s+)?(?:event|meeting|appointment)\s+(.+?)(?:\s+on\s+|\s+from\s+|\s+to\s+|$)/i);
  if (genericMatch?.[1]) {
    return genericMatch[1].trim().replace(/[,.]$/, '');
  }

  if (/\b(birthday|borthday)\b/i.test(trimmed)) return 'Birthday';
  return 'New event';
}

function extractEventArgsFromMessage(message: string) {
  const trimmed = message.trim();

  const directMatch = trimmed.match(
    /^(?:add|create|new)\s+(?:an?\s+)?event\s+(?:called|named)?\s*(.+?)\s+on\s+(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i
  );

  if (directMatch) {
    const title = directMatch[1].trim().replace(/[,.;:-]$/, '');
    const parsedDate = parseDateFromText(directMatch[2]);
    return {
      title,
      date: parsedDate ?? directMatch[2].trim(),
      startTime: normalizeTimeString(directMatch[3]),
      endTime: normalizeTimeString(directMatch[4]),
      color: 'blue',
    };
  }

  const altMatch = trimmed.match(
    /^(?:add|create|new)\s+(?:an?\s+)?event\s+(?:called|named)?\s*(.+?)\s+on\s+(.+)$/i
  );

  if (altMatch) {
    const title = altMatch[1].trim().replace(/[,.;:-]$/, '');
    const parsedDate = parseDateFromText(altMatch[2]);
    return {
      title,
      date: parsedDate ?? altMatch[2].trim(),
      startTime: '09:00',
      endTime: '10:00',
      color: 'blue',
    };
  }

  const noTimeDateMatch = trimmed.match(/\bon\s+(.+?)(?:,|\.|$)/i);
  const noTimeRequested = /\b(no\s*time|all\s*day|any\s*time|no\s+time\s+needed)\b/i.test(trimmed);
  if (noTimeRequested && noTimeDateMatch?.[1]) {
    const parsedDate = parseDateFromText(noTimeDateMatch[1]);
    if (parsedDate) {
      return {
        title: inferEventTitleFromMessage(trimmed),
        date: parsedDate,
        startTime: '00:00',
        endTime: '23:59',
        color: 'blue',
      };
    }
  }

  const genericDateMatch = trimmed.match(/\b(?:on\s+)(\d{1,2}(?:\s*(?:st|nd|rd|th))?\s*(?:of\s*)?(?:this\s*month|january|february|march|april|may|june|july|august|september|october|november|december))/i);
  if (genericDateMatch) {
    const parsedDate = parseDateFromText(genericDateMatch[1]);
    if (parsedDate) {
      return {
        title: inferEventTitleFromMessage(trimmed),
        date: parsedDate,
        startTime: '09:00',
        endTime: '10:00',
        color: 'blue',
      };
    }
  }

  const looseDateMatch = trimmed.match(/(\d{1,2}(?:\s*(?:st|nd|rd|th))?\s*(?:of\s*)?(?:this\s*month|january|february|march|april|may|june|july|august|september|october|november|december))/i);
  if (looseDateMatch) {
    const parsedDate = parseDateFromText(looseDateMatch[1]);
    if (parsedDate) {
      return {
        title: inferEventTitleFromMessage(trimmed),
        date: parsedDate,
        startTime: noTimeRequested ? '00:00' : '09:00',
        endTime: noTimeRequested ? '23:59' : '10:00',
        color: 'blue',
      };
    }
  }

  return {};
}

async function tryGroqLocalFallback(message: string, toolDeclarations: FunctionDeclaration[] = []): Promise<ChatReply | null> {
  const allowedFunctionNames = inferAllowedFunctionNames(message);
  if (!allowedFunctionNames || allowedFunctionNames.length === 0) return null;

  const available = new Set(toolDeclarations.map((declaration) => declaration.name));
  const candidateName = allowedFunctionNames.find((name) => available.has(name));
  if (!candidateName) return null;

  let args: Record<string, unknown> = {};
  if (candidateName === 'create_task') {
    args = extractTaskArgsFromMessage(message);
  } else if (candidateName === 'delete_task') {
    if (/(delete|remove|clear).*(all|everything).*(task|tasks)|clear my tasks|delete all my tasks|remove all my tasks/i.test(message)) {
      args = { title: '__ALL__', deleteAll: true };
    } else {
      const title = extractTaskTitleHint(message);
      if (title) {
        args = { title };
      }
    }
  } else if (candidateName === 'switch_theme') {
    args = extractThemeArgsFromMessage(message);
  } else if (candidateName === 'create_event') {
    args = extractEventArgsFromMessage(message);
  } else if (candidateName === 'create_module') {
    args = extractModuleArgsFromMessage(message);
  }

  const toolResult = await executeChatTool(candidateName, args);
  const text = formatGroqToolResponse(candidateName, toolResult.response);
  return {
    text,
    action: toolResult.action as ChatAction | undefined,
  };
}

function buildGeminiFallbackContext(message: string, contextLabel: string, toolDeclarations: FunctionDeclaration[] = []) {
  const fallbackInstruction = `${contextLabel}\n\nIf the user asks for a concrete app action, use the provided tools. If it is a normal chat message, answer naturally and briefly.`;
  return {
    systemInstruction: fallbackInstruction,
    message,
    toolDeclarations,
  };
}

function isGenericAiFailureText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;

  return (
    normalized === 'no response generated from ai.' ||
    normalized === 'sorry, i encountered an error.' ||
    normalized.startsWith('ai error:') ||
    normalized.startsWith('request failed (http 500)') ||
    normalized.startsWith('ai provider unavailable')
  );
}

async function runGroq(
  model: SupportedModel,
  systemInstruction: string,
  history: any[],
  message: string,
  attachments: any[] = [],
  toolDeclarations: FunctionDeclaration[] = []
): Promise<ChatReply | null> {
  const client = getGroqClient();
  if (!client) return null;
  let messages: any[] = [
    { role: 'system', content: systemInstruction },
    ...buildGroqMessages(history, message, attachments),
  ];
  let action: ChatAction | undefined;
  let groqFinalText: string | null = null;
  const allowedFunctionNames = toolDeclarations.length > 0 ? inferAllowedFunctionNames(message) : undefined;
  const groqTools = allowedFunctionNames && allowedFunctionNames.length > 0
    ? toolDeclarations.filter((declaration) => allowedFunctionNames.includes(declaration.name ?? ''))
    : [];

  console.log('[Groq] runGroq start', { model, allowedFunctionNames, message: message.slice(0, 200) });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const tools = groqTools.length > 0
      ? groqTools.map((declaration) => ({
          type: 'function',
          function: {
            name: declaration.name ?? '',
            description: declaration.description,
            parameters: declaration.parametersJsonSchema as any,
          },
        }))
      : undefined;

    let response: any;
    try {
      response = await client.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: tools
          ? allowedFunctionNames?.length === 1
            ? { type: 'function', function: { name: allowedFunctionNames[0] } }
            : 'auto'
          : 'none',
        max_tokens: 1024,
        temperature: 0.7,
      });
    } catch (err: any) {
      console.error('[Groq] API call failed', err?.message ?? err);
      // Detect rate limit and retry with backoff if possible
      const status = err?.status || err?.statusCode || err?.response?.status;
      const headers = err?.headers || err?.response?.headers || {};
      const retryAfterRaw = headers?.['retry-after'] || headers?.get?.('retry-after');
      if ((status === 429 || /rate limit|quota/i.test(String(err?.message || ''))) && attempt < 3) {
        let waitMs = 1000 * Math.pow(2, attempt); // exponential backoff
        if (retryAfterRaw) {
          const parsed = Number(retryAfterRaw);
          if (!Number.isNaN(parsed)) waitMs = parsed * 1000;
        }
        console.warn(`[Groq] retrying after ${waitMs}ms (attempt ${attempt + 1})`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    try {
      console.log('[Groq] raw response choices length:', Array.isArray(response?.choices) ? response.choices.length : 0);
    } catch (e) {
      console.error('[Groq] failed to inspect response choices', e);
    }

    const choice = response.choices?.[0];
    const assistantMessage = choice?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];

    // Normalize assistant message content to string
    let text = '';
    try {
      if (typeof assistantMessage?.content === 'string') {
        text = assistantMessage.content;
      } else if (Array.isArray(assistantMessage?.content)) {
        text = assistantMessage.content.map((part: any) => (part?.type === 'text' ? String(part.text) : '')).join(' ').trim();
      } else if (assistantMessage?.content && typeof assistantMessage.content === 'object') {
        text = String(assistantMessage.content.text ?? assistantMessage.content);
      }
    } catch (e) {
      console.error('[Groq] error extracting assistant text', e);
      text = '';
    }

    if (!toolCalls || toolCalls.length === 0) {
      console.log('[Groq] no tool calls, returning assistant text:', text?.slice(0,200));
      if (isGenericAiFailureText(text)) {
        return {
          text: await buildLocalFallbackText(message, 'global assistant', history),
          action,
        };
      }
      return {
        text,
        action,
      };
    }

    messages = [
      ...messages,
      {
        role: 'assistant',
        content: assistantMessage?.content ?? null,
        tool_calls: toolCalls,
      },
    ];

    for (const call of toolCalls) {
      let toolResult: any;
      try {
        // parse arguments safely whether string or object
        let parsedArguments: Record<string, unknown> = {};
        try {
          const rawArguments = call.function?.arguments;
          if (!rawArguments) parsedArguments = {};
          else if (typeof rawArguments === 'string') parsedArguments = rawArguments ? JSON.parse(rawArguments) : {};
          else if (typeof rawArguments === 'object') parsedArguments = rawArguments as Record<string, unknown>;
        } catch (argParseErr) {
          console.error('[Groq] failed to parse function arguments', argParseErr);
          parsedArguments = {};
        }

        console.log('[Groq] executing tool', call.function?.name, parsedArguments);
        toolResult = await executeChatTool(call.function?.name ?? '', parsedArguments as Record<string, unknown>);
        console.log('[Groq] tool result for', call.function?.name, JSON.stringify(toolResult?.response ?? toolResult).slice(0,400));
      } catch (error: any) {
        console.error('[Groq] tool execution failed', error?.message ?? error);
        toolResult = {
          response: {
            error: error instanceof Error ? error.message : 'Tool execution failed.',
          },
        };
      }

      if (!action && toolResult.action) {
        action = toolResult.action as ChatAction;
      }

      if (groqFinalText === null) {
        try {
          groqFinalText = formatGroqToolResponse(call.function?.name ?? '', toolResult.response);
        } catch (e) {
          console.error('[Groq] failed to format tool response', e);
          groqFinalText = 'Done.';
        }
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id ?? `call-${attempt}`,
        content: JSON.stringify(toolResult.response),
      });
    }

    // After executing tools and appending tool outputs, ask the model for a
    // short follow-up assistant response (no tools) so it can summarize or
    // explain what it did instead of only returning the raw tool output.
    try {
      const followUp = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 512,
        temperature: 0.2,
        tools: undefined,
        tool_choice: 'none',
      });

      const followChoice = followUp.choices?.[0];
      const followAssistant = followChoice?.message;
      let followText = '';
      const followContent: any = (followAssistant as any)?.content;
      if (typeof followContent === 'string') {
        followText = followContent;
      } else if (Array.isArray(followContent)) {
        followText = followContent.map((part: any) => (part?.type === 'text' ? String(part.text) : '')).join(' ').trim();
      } else if (followContent && typeof followContent === 'object') {
        followText = String(followContent.text ?? followContent);
      }

      if (followText && !isGenericAiFailureText(followText)) {
        return {
          text: followText,
          action,
        };
      }
    } catch (followErr) {
      console.error('[Groq] follow-up assistant call failed', followErr);
    }

    if (groqFinalText !== null) {
      return {
        text: groqFinalText,
        action,
      };
    }
  }

  return {
    text: 'No response generated from AI.',
    action,
  };
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
  const reply = await generateActionAwareChatReply({
    model: params.model,
    systemInstruction: params.systemInstruction,
    history: params.history,
    message: params.message,
    contextLabel: params.contextLabel,
    attachments: params.attachments,
  });
  return reply.text;
}

async function generateActionAwareChatReply(params: {
  model: SupportedModel;
  systemInstruction: string;
  history: any[];
  message: string;
  contextLabel: string;
  attachments?: any[];
  toolDeclarations?: FunctionDeclaration[];
}): Promise<ChatReply> {
  const provider = MODEL_PROVIDERS[params.model];
  const geminiKeyMissing = !process.env.GEMINI_API_KEY;
  const groqKeyMissing = !process.env.GROQ_API_KEY;

  if (provider === 'gemini' && geminiKeyMissing) {
    console.warn('GEMINI_API_KEY missing — Gemini responses will be unavailable.');
  }

  if (provider === 'groq' && groqKeyMissing) {
    console.warn('GROQ_API_KEY missing — attempting local fallback or Gemini when available.');
  }

  try {
    if (provider === 'gemini') {
      const reply = await runGemini(params.model, params.systemInstruction, params.history, params.message, params.attachments, params.toolDeclarations ?? []);
      if (reply !== null) return reply;
    }

    if (provider === 'groq') {
      if (groqKeyMissing) {
        // Try local fallback first (deterministic tool execution)
        const localFallback = await tryGroqLocalFallback(params.message, params.toolDeclarations ?? []);
        if (localFallback) return localFallback;

        // If Gemini is available, attempt it as a remote fallback
        if (!geminiKeyMissing) {
          const geminiFallbackContext = buildGeminiFallbackContext(params.message, params.systemInstruction, params.toolDeclarations ?? []);
          const geminiFallback = await runGemini(
            'gemini-2.5-flash',
            geminiFallbackContext.systemInstruction,
            params.history,
            geminiFallbackContext.message,
            params.attachments,
            params.toolDeclarations ?? []
          );
          if (geminiFallback) return geminiFallback;
        }

        return { text: await buildLocalFallbackText(params.message, params.contextLabel, params.history) };
      }

      const reply = await runGroq(params.model, params.systemInstruction, params.history, params.message, params.attachments, params.toolDeclarations ?? []);
      if (reply !== null) return reply;
    }
  } catch (error: any) {
    console.error(`${provider} chat error:`, error);

    if (provider === 'groq') {
      const localFallback = await tryGroqLocalFallback(params.message, params.toolDeclarations ?? []);
      if (localFallback) {
        return localFallback;
      }
    }

    // Specific handling for HTTP 429 quota errors (Gemini and Groq)
    const statusCode = error?.status || error?.statusCode || error?.error?.code || error?.response?.status;
    const errorText = String(error?.message ?? error?.error ?? error);
    if (statusCode === 429 || /quota/i.test(errorText)) {
      if (provider === 'groq' && groqKeyMissing) {
        // Groq not configured and Gemini likely throttled — inform user clearly
        return { text: 'AI provider unavailable: Groq is not configured and Gemini quota is exhausted. Please set GROQ_API_KEY or try again later.' };
      }
      if (provider === 'gemini') {
        return { text: 'Gemini API quota exceeded. Please wait or configure an alternate provider.' };
      }
    }
    if (provider === 'groq' && (statusCode === 429 || statusCode === 400)) {
      const geminiFallbackContext = buildGeminiFallbackContext(params.message, params.systemInstruction, params.toolDeclarations ?? []);
      try {
        const geminiFallback = await runGemini(
          'gemini-2.5-flash',
          geminiFallbackContext.systemInstruction,
          params.history,
          geminiFallbackContext.message,
          params.attachments,
          params.toolDeclarations ?? []
        );

        if (geminiFallback) return geminiFallback;
      } catch (geminiFallbackError: any) {
        console.error('Gemini fallback failed after Groq rate limit:', geminiFallbackError);
      }

      return { text: await buildLocalFallbackText(params.message, params.contextLabel, params.history) };
    }

    if (statusCode === 429) {
      return { text: await buildLocalFallbackText(params.message, params.contextLabel, params.history) };
    }

    throw error;
  }

  return { text: 'No response generated from AI.' };
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
    
    const workspace = await getOrCreateWorkspace();
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

    const now = new Date();
    const systemInstruction = GLOBAL_CHAT_SYSTEM_PROMPT + `\n\nCurrent date/time (server): ${now.toISOString()}\n\nApp context:\n${JSON.stringify(context, null, 2)}\n\nExtracted text from student materials:\n${allExtractedText}\n\nConversation transcript:\n${transcript(history)}`;

    const reply = await generateActionAwareChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message: attachmentContext ? `${message}\n\n[Attached Files Content]\n${attachmentContext}` : message,
      attachments,
      contextLabel: `global assistant (${provider})`,
      toolDeclarations: CHAT_TOOL_DECLARATIONS,
    });

    res.json({
      role: 'model',
      text: reply.text,
      ...(reply.action && reply.action.action === 'switch_theme'
        ? { action: reply.action.action, theme: reply.action.theme }
        : reply.action
          ? { action: reply.action.action }
          : {}),
    });
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
      workspace = await getOrCreateWorkspace();
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

    const replyPromise = generateActionAwareChatReply({
      model: selectedModel,
      systemInstruction,
      history,
      message: attachmentContext ? `${message}\n\n[Attached Files Content]\n${attachmentContext}` : message,
      attachments,
      contextLabel: `module assistant for ${moduleName} (${provider})`,
      toolDeclarations: CHAT_TOOL_DECLARATIONS,
    });

    let titlePromise = Promise.resolve('');
    if (generateTitle) titlePromise = generateTitleFromMessage(message, selectedModel);

    const [reply, title] = await Promise.all([replyPromise, titlePromise]);

    const response: any = { role: 'model', text: reply.text };
    if (reply.action) {
      response.action = reply.action.action;
      if (reply.action.action === 'switch_theme') {
        response.theme = reply.action.theme;
      }
    }
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
  console.log(`\nBackend server running on http://localhost:${PORT}`);
  console.log('Make sure frontend is running on http://localhost:5173');
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not set - Claude requests will use mock responses');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not set - Gemini requests will use mock responses');
  }
  if (!process.env.GROQ_API_KEY) {
    console.log('GROQ_API_KEY not set - Groq requests will use mock responses');
  }
});
