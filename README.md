# 📚 My-Notion: StudentOS

A personalized Notion-like productivity web app built for university students. Manage academics, personal tasks, calendar events, and leverage AI-powered file analysis with RAG.

## 🏗️ Project Structure (Monorepo)

```
my-notion/
├── frontend/              # React + Tailwind (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── store.ts
│   ├── package.json
│   └── vite.config.ts
├── backend/               # Express + Node (Port 3001)
│   ├── server.ts
│   ├── package.json
│   └── .env.example
└── package.json           # Root monorepo config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

**Option 1: Install all at once**
```bash
npm run install:all
```

**Option 2: Install separately**
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### Running the App

**Development (Runs both frontend & backend)**
```bash
npm run dev
```

**Or run separately:**
```bash
# Terminal 1 - Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 - Backend (http://localhost:3001)
cd backend && npm run dev
```

### Environment Setup

Create `.env` file in the `backend/` folder:
```bash
cp backend/.env.example backend/.env
```

Then add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
NODE_ENV=development
```

## 📋 Features

### Academic Dashboard
- ✅ Create and manage university modules
- ✅ Upload lecture notes, PDFs, and materials  
- ✅ AI-powered module-specific chat with RAG
- ✅ File organization and sorting

### Personal Dashboard
- ✅ Task manager with priority levels
- ✅ Calendar with events
- ✅ Quick notes and reminders

### Global AI Assistant
- ✅ Context-aware across all modules
- ✅ Remembers past conversations
- ✅ Access from anywhere in the app
- ⏳ Full RAG integration coming soon

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS 4
- Vite
- Lucide React Icons
- React Markdown

**Backend:**
- Express.js
- Google Gemini API (currently)
- Multer (file uploads)
- TypeScript
- Cors

## 📅 Roadmap

### Phase 1 (Current)
- [x] Project restructure (Frontend/Backend separation)
- [x] UI components and dashboards
- [ ] Complete file upload functionality
- [ ] Implement RAG for module chat
- [ ] Global chat context awareness

### Phase 2 (Next)
- [ ] Switch to Anthropic Claude API
- [ ] Persist data in MongoDB
- [ ] Add authentication (Clerk/Firebase)
- [ ] File storage (Cloudinary/Supabase)
- [ ] Calendar UI enhancement

### Phase 3 (Future)
- [ ] Notifications & reminders
- [ ] Notes with rich text editor
- [ ] PWA mobile installability
- [ ] Deploy to Vercel + Render

## 🛠️ Available Scripts

**Root Level**
```bash
npm run install:all    # Install deps for all packages
npm run dev            # Run both frontend & backend concurrently
npm run build          # Build both frontend & backend
npm start              # Start backend only
```

**Frontend Only** (`cd frontend/`)
```bash
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build
```

**Backend Only** (`cd backend/`)
```bash
npm run dev            # Start with hot-reload (tsx watch)
npm run build          # Compile TypeScript
npm run start          # Run compiled JS
```

## 🔧 Development Notes

- **API Proxy**: Frontend proxies `/api/*` requests to `http://localhost:3001` (see `frontend/vite.config.ts`)
- **Database**: Currently using localStorage on frontend; MongoDB integration coming soon
- **AI API**: Using Google Gemini (will switch to Claude in Phase 2)
- **File Storage**: Local uploads folder (will move to cloud storage)

## 📖 API Endpoints

### Chat
- `POST /api/chat/global` - Global AI assistant
- `POST /api/chat/module` - Module-specific AI chat

### Files
- `POST /api/upload` - Upload file for a module

### Health
- `GET /api/health` - Backend health check

## 🤝 Contributing

This is a personal university project. Feel free to fork and adapt for your own needs!

## 📝 License

MIT

---

**Built by Loch** | Notion-inspired Study Platform | 2025
