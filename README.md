# My-Notion: AI-Powered Student Productivity Platform

A personalized Notion-like productivity app designed specifically for students, featuring AI-assisted learning, document management, and academic scheduling.

**Live Demo:** https://my-notion-pearl.vercel.app

## 🎯 Overview

My-Notion is a comprehensive academic management platform that combines:
- **Module Management** - Organize coursework by modules/subjects
- **Task & Event Tracking** - Plan assignments and schedules
- **AI-Powered Chat** - Learn from your study materials using AI
- **File Management** - Upload and analyze PDFs and documents
- **Timetable** - Schedule lectures, labs, and tutorials
- **Global Chat** - General-purpose AI assistant

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- MongoDB (local or cloud instance via MongoDB Atlas)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/loch214/My-Notion.git
cd My-Notion
```

2. **Install all dependencies**
```bash
npm run install:all
```

This installs dependencies for:
- Root monorepo
- `/backend` - Express.js API server
- `/frontend` - React + Vite UI

3. **Configure Environment Variables**

Create `.env` file in the `backend/` directory:
```bash
cd backend
cp .env.example .env
```

Edit `.env` and add:
```
MONGODB_URI=mongodb://localhost:27017/my-notion
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/my-notion

# AI APIs (optional - for chat features)
GOOGLE_GENAI_API_KEY=your_google_genai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

4. **Start Development Servers**

From the project root:
```bash
npm run dev
```

This starts both servers concurrently:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## 📱 Core Features

### 1. **Module Management**
Create and organize study modules for each subject/course.

**Features:**
- Add module code and title
- Assign custom colors for easy identification (blue, amber, emerald, purple, rose)
- Upload study materials (PDFs, documents)
- Chat with AI about module content

**API Endpoints:**
- `POST /api/data/modules` - Create module
- `GET /api/data/modules` - List all modules
- `PATCH /api/data/modules/:moduleId` - Update module
- `DELETE /api/data/modules/:moduleId` - Delete module

### 2. **Task Management**
Track assignments and deadlines across modules.

**Features:**
- Create tasks with optional due dates
- Link tasks to specific modules
- Mark tasks as complete/incomplete
- Sort and filter by due date

**API Endpoints:**
- `POST /api/data/tasks` - Create task
- `GET /api/data/tasks` - List all tasks
- `PATCH /api/data/tasks/:taskId` - Update task (mark done, change deadline)
- `DELETE /api/data/tasks/:taskId` - Delete task

### 3. **Event & Calendar Management**
Schedule lectures, tutorials, labs, and events.

**Features:**
- Create events with start/end times
- Add descriptions and color codes
- Set reminder notifications
- Calendar view with visual overview

**API Endpoints:**
- `POST /api/data/events` - Create event
- `GET /api/data/events` - List all events
- `PATCH /api/data/events/:eventId` - Update event
- `DELETE /api/data/events/:eventId` - Delete event

### 4. **Timetable System**
Recurring schedule for lectures, labs, and tutorials.

**Data Structure:**
```typescript
interface TimetableEntry {
  id: string;
  moduleId: string;
  kind: 'lecture' | 'lab' | 'tutorial';
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  startTime: string;      // HH:MM format
  endTime: string;        // HH:MM format
  reminderMinutes: number;
  room?: string;
}
```

### 5. **AI-Powered Module Chat**
Learn from your uploaded study materials.

**Features:**
- Upload PDF and document files to modules
- Chat with AI about module content (RAG - Retrieval Augmented Generation)
- AI has access to your uploaded materials
- Message history stored per module

**Supported File Types:**
- PDF (.pdf)
- Word documents (.docx)
- Text files (.txt)

**API Endpoints:**
- `POST /api/data/chat/module/:moduleId/message` - Send message
- `GET /api/data/chat/module/:moduleId` - Get chat history

### 6. **Global Chat**
General-purpose AI assistant for any queries.

**Features:**
- Chat with AI without module context
- Useful for general learning questions
- Separate from module-specific chats

**API Endpoints:**
- `POST /api/data/chat/global/message` - Send message
- `GET /api/data/chat/global` - Get chat history

### 7. **File Upload & Management**
Store and process academic materials.

**Features:**
- Upload multiple file types
- Automatic file processing (PDF text extraction)
- Integration with Google Gemini API for file analysis
- File size and metadata tracking

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
frontend/src/
├── App.tsx                 # Main app component with routing
├── store.ts               # State management with API integration
├── types.ts               # TypeScript interfaces
├── index.css              # Global styles (Tailwind CSS)
├── components/
│   ├── AcademicOverview.tsx    # Dashboard overview
│   ├── ModuleDetail.tsx         # Module view with chat & files
│   ├── CalendarView.tsx         # Calendar & event management
│   ├── TaskList.tsx             # Task management interface
│   ├── GlobalChat.tsx           # Global AI chat
│   ├── Timetable.tsx            # Schedule management
│   ├── WorkspaceNavbar.tsx      # Navigation
│   ├── landing/                 # Landing page components
│   └── ui/                      # Reusable UI components
├── context/               # React Context for global state
├── hooks/                 # Custom React hooks
└── lib/                   # Utility functions
```

### Backend (Express + TypeScript + MongoDB)
```
backend/
├── server.ts              # Main Express server & API logic
├── models.ts              # MongoDB schemas
├── db.ts                  # Database connection
├── routes/
│   └── data.ts            # Data manipulation endpoints
└── test_groq.mjs         # Testing script for Groq API
```

### Database Schema (MongoDB)
```
Workspace (User Data Container)
├── modules[]
│   ├── id, title, code, color
│   ├── files[]
│   │   ├── id, name, size
│   │   └── geminiFileUri
│   └── chatHistory[] / chatSessions[]
│       └── messages: { id, role, text, timestamp }
├── tasks[]
│   ├── id, title, done, dueDate
│   └── moduleId (optional)
├── events[]
│   ├── id, title, startTime, endTime
│   ├── color, description, reminderMinutes
│   └── createdAt
└── globalChat
    └── messages[]
```

## 📚 Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite 6** - Build tool & dev server
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons
- **Motion** - Animations

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database
- **Multer** - File uploads
- **CORS** - Cross-origin requests
- **UUID** - ID generation

### AI Integrations
- **Google Gemini API** - File processing & chat
- **Anthropic Claude API** - Chat intelligence
- **Groq API** - Fast inference
- **Mammoth** - Document parsing

## 🔧 Configuration

### Backend Environment
Create `.env` in `backend/`:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/my-notion

# AI Providers (choose at least one)
GOOGLE_GENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk-...

# Optional
PORT=3001
NODE_ENV=development
```

### Frontend Configuration
Frontend automatically connects to `http://localhost:3001/api/data` during development.

For production, update `API_BASE` in `frontend/src/store.ts`.

## 🚀 Building for Production

### Build Frontend
```bash
npm run build --prefix frontend
```
Outputs to `frontend/dist/`

### Build Backend
```bash
npm run build --prefix backend
```
Outputs to `backend/dist/`

### Start Production Server
```bash
npm start
```
Runs backend from `backend/dist/server.js`

## 📖 Usage Examples

### Creating a Module
```typescript
// Frontend
const { addModule } = useAppStore();
await addModule('Advanced Mathematics', 'MATH301', 'purple');
```

### Uploading Files to Module
Users can upload files through the ModuleDetail component, which:
1. Sends file to backend via multipart form
2. Backend processes file (PDF extraction, etc.)
3. File integrated with Google Gemini for AI chat

### Sending Chat Messages
```typescript
// Module-specific chat
await saveModuleChatMessage(moduleId, 'user', 'Explain quantum mechanics');

// Global chat
await saveGlobalChatMessage({
  id: uuidv4(),
  role: 'user',
  text: 'How do I solve differential equations?',
  timestamp: new Date().toISOString()
});
```

### Creating Events
```typescript
await addEvent(
  'Calculus Lecture',
  '2024-05-30T10:00:00',
  '2024-05-30T12:00:00',
  'blue',
  'Chapter 5-7 coverage',
  30 // reminder 30 minutes before
);
```

## 📊 API Reference

### Base URL
- Development: `http://localhost:3001/api/data`
- Production: `https://my-notion-api.example.com/api/data`

### Authentication
Currently no authentication. Future versions should add:
- User authentication (JWT)
- Per-user workspace isolation
- Access controls

### Data Endpoints

#### Modules
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/modules` | List all modules |
| POST | `/modules` | Create module |
| PATCH | `/modules/:id` | Update module |
| DELETE | `/modules/:id` | Delete module |

#### Tasks
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

#### Events
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/events` | List all events |
| POST | `/events` | Create event |
| PATCH | `/events/:id` | Update event |
| DELETE | `/events/:id` | Delete event |

#### Chat
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/chat/global` | Get global chat history |
| POST | `/chat/global/message` | Send global message |
| POST | `/chat/module/:id/message` | Send module message |

#### Workspace
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspace` | Get complete workspace state |

## 🎨 UI Components

Key reusable components in `frontend/src/components/ui/`:
- Buttons, inputs, modals
- Cards, badges, avatars
- Dropdowns, tabs, dialogs
- Notifications, alerts

## 🔐 Security Notes

⚠️ **Current Implementation:**
- No authentication
- No API rate limiting
- MongoDB exposed without credentials (if local)

**For production, add:**
- User authentication (OAuth2, JWT)
- API key validation
- Rate limiting
- CORS configuration
- Input validation & sanitization
- MongoDB authentication
- HTTPS only

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev --prefix backend
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running locally
mongod

# Or use MongoDB Atlas connection string in .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/my-notion
```

### CORS Errors
- Backend CORS already configured for `http://localhost:5173`
- For different frontend URL, update CORS in `backend/server.ts`

### Module Chat Not Working
- Ensure AI API keys are set in `.env`
- Check file upload succeeded (check backend logs)
- Verify file format is supported (PDF, DOCX)

## 📝 Scripts

```bash
# Root level
npm run install:all    # Install all dependencies
npm run dev           # Start both frontend & backend
npm run build         # Build both projects
npm start             # Start production backend

# Frontend only
npm run dev --prefix frontend      # Dev server (port 5173)
npm run build --prefix frontend    # Build
npm run preview --prefix frontend  # Preview build

# Backend only
npm run dev --prefix backend       # Dev server with watch (port 3001)
npm run build --prefix backend     # Compile TypeScript
npm start --prefix backend         # Start from compiled dist/
npm run lint --prefix backend      # Type check
```

## 📄 License

MIT - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions, please open a GitHub issue.

---

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Built with ❤️ for students**
