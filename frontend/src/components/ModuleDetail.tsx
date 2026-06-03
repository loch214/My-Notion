import React, { useState } from 'react';
import { Module, UploadedFile, ChatMessage, Task, ChatSession } from '../types';
import { ChevronLeft, FileText, Upload, FileUp, Sparkles, MessageSquare, Loader2, X, ChevronDown, CheckSquare, Plus, Paperclip, Image as ImageIcon, PanelLeftClose, PanelLeftOpen, ArrowRight, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { API_BASE } from '../lib/api';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL, readStoredAIModel, writeStoredAIModel } from '../lib/models';
import { TaskList } from './TaskList';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { isThemeId } from '../lib/themes/applyTheme';

// Import UI primitives
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { Tabs } from './ui/Tabs';
import { Modal } from './ui/Modal';

interface ModuleDetailProps {
  module: Module;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
  onBack: () => void;
  updateModule: (moduleId: string, updates: Partial<Module>) => void;
  refreshWorkspace: () => Promise<void>;
}

const LOCAL_MODEL_KEY = 'myNotion.moduleChat.model';

export function ModuleDetail({
  module,
  tasks,
  onToggleTask,
  onAddTask,
  onEditTask,
  onRemoveTask,
  onBack,
  updateModule,
  refreshWorkspace
}: ModuleDetailProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'chat' | 'tasks'>('files');
  const [isUploading, setIsUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState<AIModelId>(() => readStoredAIModel(LOCAL_MODEL_KEY, DEFAULT_AI_MODEL));
  const [fileSort, setFileSort] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [chatAttachments, setChatAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);
  const { setTheme } = useTheme();

  // Get sessions, or migrate from chatHistory if none exist
  const sessions: ChatSession[] = module.chatSessions || [];

  React.useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Migration logic
  React.useEffect(() => {
    if (sessions.length === 0 && module.chatHistory && module.chatHistory.length > 0) {
       const migratedSession = {
         id: uuidv4(),
         title: 'Previous Chat',
         history: module.chatHistory,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       };
       updateModule(module.id, { 
         chatSessions: [migratedSession],
         chatHistory: [] 
       });
       setActiveSessionId(migratedSession.id);
    }
  }, [module.chatHistory, sessions.length]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentChatHistory = activeSession ? activeSession.history : [];

  React.useEffect(() => {
    if (scrollRef.current && activeTab === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChatHistory, activeTab]);

  React.useEffect(() => {
    if (activeTab !== 'chat') {
      setIsMobileSessionsOpen(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    writeStoredAIModel(LOCAL_MODEL_KEY, chatModel);
  }, [chatModel]);

  const handleNewChat = () => {
    const newSession = {
      id: uuidv4(),
      title: 'New Chat',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateModule(module.id, { 
      chatSessions: [newSession, ...sessions] 
    });
    setActiveSessionId(newSession.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.id) {
        const newFile: UploadedFile = {
          id: data.id,
          name: data.name,
          size: data.size,
          geminiFileUri: data.geminiFileUri,
          extractedText: data.extractedText,
          uploadedAt: new Date().toISOString(),
        };
        updateModule(module.id, { files: [...module.files, newFile] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && chatAttachments.length === 0) || isChatLoading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];
    
    // Create first session if none exists
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      const newSession = {
        id: currentSessionId,
        title: 'New Chat',
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      currentSessions = [newSession, ...currentSessions];
      setActiveSessionId(currentSessionId);
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: chatInput,
      timestamp: new Date().toISOString(),
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined,
    };

    const sessionIndex = currentSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex === -1) return;

    const updatedHistory = [...currentSessions[sessionIndex].history, userMessage];
    const isFirstMessage = updatedHistory.length === 1;

    // Optimistic update
    currentSessions[sessionIndex] = {
      ...currentSessions[sessionIndex],
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };
    updateModule(module.id, { chatSessions: currentSessions });

    const currentInput = chatInput;
    const currentAttachments = [...chatAttachments];
    setChatInput('');
    setChatAttachments([]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          moduleId: module.id,
          moduleName: module.title,
          history: updatedHistory.slice(0, -1),
          files: module.files,
          model: chatModel,
          attachments: currentAttachments,
          generateTitle: isFirstMessage
        }),
      });
      const data = await res.json();

      if (data.action === 'switch_theme' && typeof data.theme === 'string' && isThemeId(data.theme)) {
        setTheme(data.theme);
      }

      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: data.text || 'Error generating response',
        timestamp: new Date().toISOString(),
      };

      const finalSessions = [...currentSessions];
      const finalSessionIndex = finalSessions.findIndex(s => s.id === currentSessionId);
      if (finalSessionIndex !== -1) {
        finalSessions[finalSessionIndex] = {
          ...finalSessions[finalSessionIndex],
          history: [...finalSessions[finalSessionIndex].history, modelMessage],
          title: data.title || finalSessions[finalSessionIndex].title,
          updatedAt: new Date().toISOString()
        };
        
        const updates: Partial<Module> = { chatSessions: finalSessions };
        if (data.files) {
          updates.files = data.files;
        }
        updateModule(module.id, updates);
      }

      if (data.action) {
        await refreshWorkspace();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const modelOptions = AI_MODELS.map(model => ({
    id: model.id,
    label: model.label,
    badge: model.badge
  }));

  const fileSortOptions = [
    { id: 'newest', label: 'Newest first' },
    { id: 'oldest', label: 'Oldest first' },
    { id: 'alpha', label: 'Alphabetical' }
  ];

  const detailTabs = [
    { id: 'files', label: 'Files', icon: <FileText className="h-4 w-4" /> },
    { id: 'chat', label: 'Study chat', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> }
  ];

  return (
    <div className="flex min-h-0 flex-col text-[color:var(--text)]">
      
      {/* 1. Module Header */}
      <header className={`flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between ${activeTab === 'chat' ? 'mb-1 gap-1.5' : 'mb-6 gap-2.5'}`}>
        <div>
          <button 
            onClick={onBack} 
            className={`inline-flex items-center gap-1.5 text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] ${activeTab === 'chat' ? 'mb-0.5 text-[10px]' : 'mb-2 text-xs'}`}
          >
            <ChevronLeft className="h-3 w-3" /> Back to overview
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`font-bold font-heading tracking-tight ${activeTab === 'chat' ? 'text-xl' : 'text-3xl'}`}>{module.title}</h1>
            <span className={`rounded-full border border-[color:var(--border)] bg-[color:var(--surface-low)] px-2 py-0.5 font-mono text-[color:var(--muted)] ${activeTab === 'chat' ? 'text-[10px]' : 'text-xs'}`}>
              {module.code}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Responsive Tabs and Model selects */}
      <div className={`flex flex-col gap-2 border-b border-[color:var(--border)] lg:flex-row lg:items-end lg:justify-between shrink-0 ${activeTab === 'chat' ? 'mb-0 pb-2' : 'mb-6 pb-3 gap-3'}`}>
        <div className="flex-1 min-w-0 pr-4">
          <Tabs
            tabs={detailTabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>

        {activeTab === 'chat' && (
          <div className="flex flex-wrap items-center gap-2 self-start shrink-0 lg:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMobileSessionsOpen(true)}
              className="lg:hidden"
            >
              Sessions
            </Button>
            <div className="w-full sm:w-40">
              <Dropdown
                options={modelOptions}
                selectedId={chatModel}
                onSelect={(id) => setChatModel(id as AIModelId)}
                placeholder="Choose model"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Render Tabs details */}
      <div className="flex-1 min-h-0">
        {activeTab === 'files' && (
          <div className="pb-8 space-y-6">
            
            {/* Upload Area inside Card */}
            <Card spotlight={true} className="card-pad text-center bg-[color:var(--surface-low)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)]">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </div>
              <h3 className="text-base font-bold font-heading text-[color:var(--text)]">Files</h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-[color:var(--muted)] leading-relaxed">
                Add course files here.
              </p>
              <label className="btn-primary mt-5 cursor-pointer">
                Select files
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
              </label>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-[color:var(--text)] min-w-0">Uploaded Files ({module.files.length})</h3>
              <div className="w-full sm:w-36">
                <Dropdown
                  options={fileSortOptions}
                  selectedId={fileSort}
                  onSelect={(id) => setFileSort(id as any)}
                  placeholder="Sort files"
                />
              </div>
            </div>

            {/* Files Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...module.files]
                .sort((a, b) => {
                  if (fileSort === 'alpha') return a.name.localeCompare(b.name);
                  if (fileSort === 'oldest') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                  return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
                })
                .map((file) => (
                  <Card key={file.id} spotlight={true} className="card-pad bg-[color:var(--surface-low)] relative group">
                    <div className="flex items-start gap-3 pr-6">
                      <div className="rounded-xl bg-[color:var(--surface-med)] p-2.5 text-[color:var(--accent)] border border-[color:var(--border)] shrink-0">
                        <FileUp className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[color:var(--text)]" title={file.name}>{file.name}</p>
                        <p className="mt-1 text-[10px] text-[color:var(--muted)]">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateModule(module.id, { files: module.files.filter((currentFile) => currentFile.id !== file.id) })}
                      className="absolute right-2.5 top-2.5 rounded-full p-1 text-[color:var(--muted)] opacity-60 transition-all duration-150 ease hover:opacity-100 hover:bg-[color:var(--surface-med)] hover:text-rose-400"
                      aria-label="Delete file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))}
              {module.files.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-[color:var(--muted)]">
                  No files uploaded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex min-h-[min(80vh,680px)] max-h-[80vh] flex-col gap-4 lg:flex-row">
            
            {/* Desktop Sessions list sidebar (Collapsible) */}
            <div className={cn(
              "hidden lg:flex flex-col rounded-2xl bg-[color:var(--surface-low)] border border-[color:var(--border)] overflow-hidden transition-all duration-150 ease shrink-0 min-w-0",
              isSidebarCollapsed ? "w-20" : "w-60"
            )}>
              <div className="p-3 border-b border-[color:var(--border)] flex items-center justify-between gap-2">
                {!isSidebarCollapsed && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNewChat}
                    className="flex-1"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    New Chat
                  </Button>
                )}
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)] focus:outline-none",
                    isSidebarCollapsed && "mx-auto"
                  )}
                  title={isSidebarCollapsed ? "Expand study sessions" : "Collapse study sessions"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={cn(
                      "w-full rounded-xl py-2.5 text-left text-xs transition-all duration-150 ease relative group flex flex-col justify-center",
                      activeSessionId === s.id 
                        ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)] font-semibold border border-[color:var(--accent)]/15" 
                        : "text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]",
                      isSidebarCollapsed ? "px-0 items-center" : "px-3.5"
                    )}
                  >
                    {isSidebarCollapsed ? (
                      <MessageSquare className="h-4.5 w-4.5" />
                    ) : (
                      <>
                        <div className="truncate pr-5">{s.title}</div>
                        <div className="mt-0.5 text-[9px] opacity-60">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateModule(module.id, { chatSessions: sessions.filter(sess => sess.id !== s.id) });
                            if (activeSessionId === s.id) setActiveSessionId(null);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 transition-all duration-150 ease hover:text-rose-400"
                          aria-label="Delete chat"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </button>
                ))}
                {sessions.length === 0 && (
                  <div className="px-2 py-8 text-center text-[10px] text-[color:var(--muted)]">
                    {isSidebarCollapsed ? <Plus className="h-4 w-4 mx-auto" /> : "No past sessions"}
                  </div>
                )}
              </div>
            </div>

              {/* Chat dialog panel container */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)]">
              
              {/* Mobile Sessions strip */}
              <div className="flex items-center justify-between border-b border-[color:var(--border)] p-3 lg:hidden shrink-0 bg-[color:var(--surface-med)]/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">
                  {activeSession?.title || 'Study Chat'}
                </span>
                <button 
                  onClick={handleNewChat}
                  className="h-10 w-10 rounded-full text-[color:var(--accent)] transition-all duration-150 ease hover:bg-[color:var(--accent)]/10"
                  aria-label="New study chat session"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Message scroll list */}
              <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_42%)] px-4 py-4 text-sm leading-relaxed scroll-smooth" ref={scrollRef}>
                {currentChatHistory.length === 0 && (
                  <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]/80">
                    <p className="text-sm font-bold text-[color:var(--text)] font-heading">Interactive Module Guide</p>
                    <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
                      Ask for summaries, lecture notes flashcards, syllabus breakdowns, or quiz mockups grounded in {module.code} slides.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => setChatInput('Explain the first topic from the uploaded lectures.')}
                        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-high)]/60 px-3 py-1.5 text-[10px] text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] hover:border-[color:var(--border-focus)]/30"
                      >
                        Explain first topic
                      </button>
                      <button
                        onClick={() => setChatInput('Give me a quiz question about the lecture content.')}
                        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-high)]/60 px-3 py-1.5 text-[10px] text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] hover:border-[color:var(--border-focus)]/30"
                      >
                        Quiz me
                      </button>
                    </div>
                  </Card>
                )}

                {currentChatHistory.map((message) => (
                  <div key={message.id} className={`flex min-w-0 gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm text-[9px] font-bold ${
                      message.role === 'user' 
                        ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' 
                        : 'bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]'
                    }`}>
                      {message.role === 'user' ? 'YOU' : <Sparkles className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn(
                      'min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm border',
                      message.role === 'user' 
                        ? 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--text)]' 
                        : 'bg-[color:var(--surface-high)]/30 border-[color:var(--border)] text-[color:var(--text)]'
                    )}>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-[color:var(--surface-low)] px-2 py-1 text-[9px] font-medium border border-[color:var(--border)]">
                              {att.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                              <span className="max-w-[100px] truncate">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none break-words dark:prose-invert text-sm [&_p]:break-words [&_li]:break-words [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                        <Markdown>{message.text}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)]/20 px-3.5 py-2 text-sm text-[color:var(--muted)]">
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[color:var(--accent)]" /> AI is typing...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input panel */}
              <div className="border-t border-[color:var(--border)] px-4 py-3 shrink-0 bg-[color:var(--surface-low)]/70 backdrop-blur-sm will-change-transform transform-gpu pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {chatAttachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2 px-1">
                    {chatAttachments.map((att, i) => (
                      <div key={i} className="group relative flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-2.5 py-1.5 text-xs">
                        {att.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-[color:var(--accent)]" /> : <Paperclip className="h-3.5 w-3.5 text-[color:var(--accent)]" />}
                        <span className="max-w-[120px] truncate font-medium text-xs">{att.name}</span>
                        <button 
                          onClick={() => setChatAttachments(prev => prev.filter((_, index) => index !== i))}
                          className="ml-1 rounded-full p-0.5 text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (prev) => {
                          const base64 = prev.target?.result as string;
                          setChatAttachments(current => [...current, {
                            name: file.name,
                            type: file.type,
                            data: base64
                          }]);
                        };
                        reader.readAsDataURL(file);
                      });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="icon-btn shrink-0 bg-[color:var(--surface-med)] border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-high)]"
                    title="Attach images or slides"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                  
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_3rem] gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask lecture summaries or paper points..."
                      className="min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || (!chatInput.trim() && chatAttachments.length === 0)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-[color:var(--on-accent)] transition-all duration-150 ease hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="pb-8 pt-2">
            <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
              <TaskList 
                tasks={tasks}
                onToggleTask={onToggleTask}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onRemoveTask={onRemoveTask}
                title="Class Todo tasks"
              />
            </Card>
          </div>
        )}
      </div>

      {/* 4. Mobile Session overlay list primitive modal */}
      <Modal
        isOpen={isMobileSessionsOpen}
        onClose={() => setIsMobileSessionsOpen(false)}
        title={module.title}
        subtitle="Sessions"
        maxWidthClassName="max-w-sm"
      >
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={() => {
              handleNewChat();
              setIsMobileSessionsOpen(false);
            }}
            className="w-full"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Chat
          </Button>
          <div className="max-h-[50vh] overflow-y-auto space-y-1.5 -mr-1 pr-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsMobileSessionsOpen(false);
                }}
                className={cn(
                  'flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left border transition-all duration-150 ease text-xs',
                  activeSessionId === session.id 
                    ? 'bg-[color:var(--accent)]/10 border-[color:var(--accent)] text-[color:var(--accent)] font-semibold' 
                    : 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--muted)]'
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[color:var(--text)]">{session.title}</div>
                  <div className="mt-1 text-[10px] text-[color:var(--muted)] opacity-80">{new Date(session.updatedAt).toLocaleDateString()}</div>
                </div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="py-8 text-center text-xs text-[color:var(--muted)]">
                No past sessions yet.
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
