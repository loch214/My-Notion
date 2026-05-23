import React, { useState } from 'react';
import { Module, UploadedFile, ChatMessage, Task } from '../types';
import { ChevronLeft, FileText, Upload, FileUp, Sparkles, MessageSquare, Loader2, X, ChevronDown, CheckSquare, Plus, Paperclip, Image as ImageIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL } from '../lib/models';
import { TaskList } from './TaskList';
import { cn } from '../lib/utils';

interface ModuleDetailProps {
  module: Module;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
  onBack: () => void;
  updateModule: (moduleId: string, updates: Partial<Module>) => void;
}

export function ModuleDetail({ module, tasks, onToggleTask, onAddTask, onEditTask, onRemoveTask, onBack, updateModule }: ModuleDetailProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'chat' | 'tasks'>('files');
  const [isUploading, setIsUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState(DEFAULT_AI_MODEL);
  const [fileSort, setFileSort] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get sessions, or migrate from chatHistory if none exist
  const sessions = module.chatSessions || [];

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
      const res = await fetch('/api/upload', {
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
      const res = await fetch('/api/chat/module', {
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-190px)] flex-col text-[color:var(--text)]">
      <header className="mb-6 flex shrink-0 items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-sm text-muted transition hover:text-[color:var(--text)]">
            <ChevronLeft className="h-4 w-4" /> Back to overview
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{module.title}</h1>
            <span className="rounded-full border border-subtle surface-soft px-3 py-1 text-xs font-mono text-muted">{module.code}</span>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-end justify-between gap-4 border-b border-subtle pb-2">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('files')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === 'files' ? 'bg-[color:var(--text)] text-[color:var(--app-bg)]' : 'text-muted hover:text-[color:var(--text)]'}`}
          >
            <FileText className="h-4 w-4" /> Files
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === 'chat' ? 'bg-[color:var(--text)] text-[color:var(--app-bg)]' : 'text-muted hover:text-[color:var(--text)]'}`}
          >
            <MessageSquare className="h-4 w-4" /> Study chat
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === 'tasks' ? 'bg-[color:var(--text)] text-[color:var(--app-bg)]' : 'text-muted hover:text-[color:var(--text)]'}`}
          >
            <CheckSquare className="h-4 w-4" /> Tasks
          </button>
        </div>

        {activeTab === 'chat' && (
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
            >
              {AI_MODELS.find(m => m.id === chatModel)?.label}
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {isModelDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl surface border border-subtle shadow-xl p-1.5">
                  {AI_MODELS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setChatModel(option.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${chatModel === option.id ? 'bg-accent text-[color:var(--on-accent)] font-medium' : 'text-[color:var(--text)] hover:bg-[color:var(--surface-soft)]'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1">
        {activeTab === 'files' && (
          <div className="pb-8 animate-fade-up">
            <div className="surface rounded-[2rem] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-[color:var(--on-accent)] shadow-lg shadow-black/20">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </div>
              <h3 className="text-xl font-semibold">Upload lecture notes or reading materials</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                Add PDFs, DOCX, or text files and use them as study context for your module AI.
              </p>
              <label className="btn-primary mt-5 cursor-pointer px-5 py-3 text-sm font-semibold">
                Select files
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Uploaded files ({module.files.length})</h3>
              <div className="relative">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
                >
                  {fileSort === 'newest' ? 'Newest first' : fileSort === 'oldest' ? 'Oldest first' : 'Alphabetical'}
                  <ChevronDown className="h-4 w-4 text-muted" />
                </button>
                {isSortDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsSortDropdownOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 min-w-[160px] overflow-hidden rounded-2xl surface border border-subtle shadow-xl p-1.5">
                      {[
                        { id: 'newest', label: 'Newest first' },
                        { id: 'oldest', label: 'Oldest first' },
                        { id: 'alpha', label: 'Alphabetical' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setFileSort(option.id as any);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${fileSort === option.id ? 'bg-accent text-[color:var(--on-accent)] font-medium' : 'text-[color:var(--text)] hover:bg-[color:var(--surface-soft)]'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...module.files]
                .sort((a, b) => {
                  if (fileSort === 'alpha') return a.name.localeCompare(b.name);
                  if (fileSort === 'oldest') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                  return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
                })
                .map((file) => (
                  <div key={file.id} className="surface-soft group relative rounded-3xl p-4 transition hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl surface-soft p-3 text-accent border border-subtle">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 pr-8">
                        <p className="truncate text-sm font-semibold" title={file.name}>{file.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateModule(module.id, { files: module.files.filter((currentFile) => currentFile.id !== file.id) })}
                      className="absolute right-3 top-3 rounded-full p-2 text-muted opacity-70 transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              {module.files.length === 0 && <div className="col-span-full py-10 text-center text-muted">No files uploaded yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex h-[600px] gap-6 animate-fade-up">
            {/* Sessions Sidebar */}
            <div className={cn(
              "hidden md:flex flex-col rounded-[2rem] surface border border-subtle overflow-hidden transition-all duration-300",
              isSidebarCollapsed ? "w-20" : "w-64"
            )}>
              <div className="p-4 border-b border-subtle flex items-center justify-between gap-2">
                {!isSidebarCollapsed && (
                  <button 
                    onClick={handleNewChat}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[color:var(--on-accent)] transition hover:scale-[1.02] active:scale-[0.98] truncate"
                  >
                    <Plus className="h-4 w-4" /> New Chat
                  </button>
                )}
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={cn(
                    "rounded-xl p-2 text-muted hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)] transition",
                    isSidebarCollapsed && "w-full flex justify-center"
                  )}
                  title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-left text-sm transition group relative",
                      activeSessionId === s.id 
                        ? "bg-accent/10 text-accent font-medium" 
                        : "text-muted hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]",
                      isSidebarCollapsed && "px-0 flex justify-center"
                    )}
                  >
                    {isSidebarCollapsed ? (
                      <MessageSquare className="h-5 w-5" />
                    ) : (
                      <>
                        <div className="truncate pr-6">{s.title}</div>
                        <div className="mt-1 text-[10px] opacity-50">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateModule(module.id, { chatSessions: sessions.filter(sess => sess.id !== s.id) });
                            if (activeSessionId === s.id) setActiveSessionId(null);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </button>
                ))}
                {sessions.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted">
                    {isSidebarCollapsed ? <Plus className="h-4 w-4 mx-auto" /> : "No past sessions"}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Main Area */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-[2rem] surface border border-subtle shadow-inner">
              {/* Mobile Sessions Header */}
              <div className="flex items-center justify-between border-b border-subtle p-3 md:hidden">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {activeSession?.title || 'New Chat'}
                </span>
                <button 
                  onClick={handleNewChat}
                  className="rounded-lg p-1.5 text-accent hover:bg-accent/10 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6 scroll-smooth" ref={scrollRef}>
                {currentChatHistory.length === 0 && (
                  <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center text-muted">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-[color:var(--on-accent)] shadow-lg shadow-black/20">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-[color:var(--text)]">Module AI assistant</h3>
                    <p className="mt-2 text-sm leading-6">
                      Ask for summaries, explanations, flashcards, or exam-style questions based on {module.code} materials.
                    </p>
                  </div>
                )}

                {currentChatHistory.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${message.role === 'user' ? 'bg-accent text-[color:var(--on-accent)]' : 'surface-strong text-accent border border-subtle'}`}>
                      {message.role === 'user' ? <span className="text-xs font-bold">YOU</span> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      message.role === 'user' 
                        ? 'surface-strong text-[color:var(--text)] border border-subtle' 
                        : 'surface-soft text-[color:var(--text)] border border-subtle'
                    }`}>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-1.5 rounded-lg surface-soft px-2 py-1 text-[10px] font-medium backdrop-blur-sm">
                              {att.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                              <span className="max-w-[100px] truncate">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={`prose prose-sm max-w-none dark:prose-invert`}>
                        <Markdown>{message.text}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[color:var(--on-accent)]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex items-center rounded-3xl border border-subtle surface-soft px-4 py-3 text-sm text-muted">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent" /> AI is synthesizing...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-subtle bg-transparent p-4">
                {chatAttachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2 px-2">
                    {chatAttachments.map((att, i) => (
                      <div key={i} className="group relative flex items-center gap-2 rounded-xl border border-subtle surface-soft px-3 py-1.5 text-xs animate-fade-in">
                        {att.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-accent" /> : <Paperclip className="h-3.5 w-3.5 text-accent" />}
                        <span className="max-w-[120px] truncate font-medium">{att.name}</span>
                        <button 
                          onClick={() => setChatAttachments(prev => prev.filter((_, index) => index !== i))}
                          className="ml-1 rounded-full p-0.5 hover:bg-[color:var(--surface-soft)] text-muted hover:text-[color:var(--text)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mx-auto flex max-w-4xl gap-2 items-end">
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
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl surface-soft border border-subtle text-muted transition hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--text)]"
                    title="Attach images or files"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="surface-soft min-h-[46px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
                    rows={1}
                    placeholder="Ask a question about the uploaded materials..."
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isChatLoading || (!chatInput.trim() && chatAttachments.length === 0)}
                    className="flex h-[46px] shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-[color:var(--on-accent)] transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 text-center text-[10px] uppercase tracking-[0.24em] text-muted">
                  Responses are grounded in your module files
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="pb-8 pt-2 animate-fade-up">
            <TaskList 
              tasks={tasks}
              onToggleTask={onToggleTask}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              title={`${module.title} Tasks`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
