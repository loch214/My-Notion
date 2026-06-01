import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  X,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppState, ChatMessage, ChatSession, TimetableEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL, readStoredAIModel, writeStoredAIModel } from '../lib/models';
import { useTheme } from '../context/ThemeContext';
import { isThemeId } from '../lib/themes/applyTheme';

import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';

interface GlobalChatProps {
  onClose: () => void;
  state: AppState;
  saveGlobalChatMessage: (message: ChatMessage) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  timetableEntries: TimetableEntry[];
  onAction: (action: { action: string; [key: string]: unknown }) => Promise<void> | void;
}

const LOCAL_CONV_KEY = 'myNotion.globalChats';
const LOCAL_ACTIVE_KEY = 'myNotion.globalChat.activeId';
const LOCAL_DRAWER_WIDTH_KEY = 'myNotion.globalChat.drawerWidth';
const LOCAL_MODEL_KEY = 'myNotion.globalChat.model';
let didSeedInitialChatThisLoad = false;

function readSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(sessions));
  } catch {
    // ignore storage failures
  }
}

function writeActiveSessionId(sessionId: string | null) {
  try {
    if (sessionId) {
      localStorage.setItem(LOCAL_ACTIVE_KEY, sessionId);
    } else {
      localStorage.removeItem(LOCAL_ACTIVE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function createSession(title = 'New chat'): ChatSession {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

function summarizeTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New chat';
  const words = trimmed.split(' ').slice(0, 6).join(' ');
  return words.length > 40 ? `${words.slice(0, 37)}...` : words;
}

export function GlobalChat({ onClose, state, saveGlobalChatMessage, refreshWorkspace, timetableEntries, onAction }: GlobalChatProps) {
  const DRAWER_MIN_WIDTH = 460;
  const DRAWER_DEFAULT_WIDTH = 560;
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState<AIModelId>(() => readStoredAIModel(LOCAL_MODEL_KEY, DEFAULT_AI_MODEL));
  const [attachments, setAttachments] = React.useState<{ name: string; type: string; data: string }[]>([]);
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [conversations, setConversations] = React.useState<ChatSession[]>(() => readSessions());
  const [activeConvId, setActiveConvId] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_ACTIVE_KEY);
    } catch {
      return null;
    }
  });
  const [drawerWidth, setDrawerWidth] = React.useState<number>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_DRAWER_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) ? parsed : DRAWER_DEFAULT_WIDTH;
    } catch {
      return DRAWER_DEFAULT_WIDTH;
    }
  });
  const [activeHistory, setActiveHistory] = React.useState<ChatMessage[]>([]);
  const { setTheme } = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const isResizingRef = React.useRef(false);
  const resizeStartXRef = React.useRef(0);
  const resizeStartWidthRef = React.useRef(DRAWER_DEFAULT_WIDTH);

  const clampDrawerWidth = React.useCallback((width: number) => {
    const viewportMax = Math.max(DRAWER_MIN_WIDTH, window.innerWidth - 32);
    return Math.min(Math.max(width, DRAWER_MIN_WIDTH), viewportMax);
  }, []);

  const modelOptions = AI_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    badge: m.badge,
  }));

  const activeConversation = React.useMemo(
    () => conversations.find((session) => session.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  const persistConversations = React.useCallback((next: ChatSession[], nextActiveId?: string | null, nextHistory?: ChatMessage[]) => {
    setConversations(next);
    writeSessions(next);
    if (nextActiveId !== undefined) {
      setActiveConvId(nextActiveId);
      writeActiveSessionId(nextActiveId);
    }
    if (nextHistory !== undefined) {
      setActiveHistory(nextHistory);
    }
  }, []);

  const startFreshConversation = React.useCallback(() => {
    const fresh = createSession();
    const existing = readSessions().filter((session) => session.id !== fresh.id);
    persistConversations([fresh, ...existing], fresh.id, []);
    return fresh;
  }, [persistConversations]);

  React.useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 768);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  React.useEffect(() => {
    setDrawerWidth((prev) => clampDrawerWidth(prev));
  }, [clampDrawerWidth, isMobile]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DRAWER_WIDTH_KEY, String(drawerWidth));
    } catch {
      // ignore storage failures
    }
  }, [drawerWidth]);

  React.useEffect(() => {
    writeStoredAIModel(LOCAL_MODEL_KEY, model);
  }, [model]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current || isMobile) return;
      const deltaX = event.clientX - resizeStartXRef.current;
      const next = clampDrawerWidth(resizeStartWidthRef.current - deltaX);
      // Write directly to the DOM during drag to avoid React re-render per pixel
      if (drawerRef.current) {
        drawerRef.current.style.width = `${next}px`;
      }
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Sync React state on mouseup only
      if (drawerRef.current) {
        const finalWidth = parseFloat(drawerRef.current.style.width);
        if (Number.isFinite(finalWidth)) {
          setDrawerWidth(finalWidth);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampDrawerWidth, isMobile]);

  const handleResizeStart = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    event.preventDefault();
    isResizingRef.current = true;
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = drawerWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [drawerWidth, isMobile]);

  React.useEffect(() => {
    if (didSeedInitialChatThisLoad) {
      const sessions = readSessions();
      const storedActiveId = localStorage.getItem(LOCAL_ACTIVE_KEY);
      const restored = sessions.find((session) => session.id === storedActiveId) ?? sessions[0] ?? null;
      setConversations(sessions);
      setActiveConvId(restored?.id ?? null);
      setActiveHistory(restored?.history ?? []);
      if (restored) {
        writeActiveSessionId(restored.id);
      }
      return;
    }

    didSeedInitialChatThisLoad = true;
    startFreshConversation();
  }, [startFreshConversation]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeHistory]);

  const selectConversation = React.useCallback((session: ChatSession) => {
    setActiveConvId(session.id);
    setActiveHistory(session.history || []);
    writeActiveSessionId(session.id);
  }, []);

  const updateConversation = React.useCallback((sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setConversations((prev) => {
      const next = prev.map((session) => (session.id === sessionId ? updater(session) : session));
      writeSessions(next);
      return next;
    });
  }, []);

  const handleNewConversation = React.useCallback(() => {
    const fresh = createSession();
    setConversations((prev) => {
      const next = [fresh, ...prev.filter((session) => session.id !== fresh.id)];
      writeSessions(next);
      return next;
    });
    setActiveConvId(fresh.id);
    setActiveHistory([]);
    writeActiveSessionId(fresh.id);
  }, []);

  const handleDeleteConversation = React.useCallback((sessionId: string) => {
    setConversations((prev) => {
      const next = prev.filter((session) => session.id !== sessionId);
      writeSessions(next);

      if (activeConvId === sessionId) {
        const replacement = next[0] ?? createSession();
        const nextWithReplacement = next.length > 0 ? next : [replacement];
        writeSessions(nextWithReplacement);
        setActiveConvId(replacement.id);
        setActiveHistory(replacement.history || []);
        writeActiveSessionId(replacement.id);
        return nextWithReplacement;
      }

      return next;
    });
  }, [activeConvId]);

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    if (!activeConversation) {
      const fresh = startFreshConversation();
      setActiveConvId(fresh.id);
      setActiveHistory([]);
    }

    const currentHistory = activeHistory;
    const currentInput = input;
    const currentAttachments = [...attachments];

    setInput('');
    setAttachments([]);
    setIsLoading(true);

    const nextUserHistory = [...currentHistory, userMessage];
    setActiveHistory(nextUserHistory);
    if (activeConvId) {
      updateConversation(activeConvId, (session) => ({
        ...session,
        title: session.title === 'New chat' ? summarizeTitle(currentInput) : session.title,
        history: [...(session.history || []), userMessage],
        updatedAt: new Date().toISOString(),
      }));
    }

    try {
      await saveGlobalChatMessage(userMessage);

      const response = await fetch('/api/chat/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          history: currentHistory,
          model,
          attachments: currentAttachments,
          context: {
            tasks: state.tasks,
            events: state.events,
            modules: state.modules.map((module) => ({
                id: module.id,
              title: module.title,
              code: module.code,
                color: module.color,
              fileCount: module.files.length,
            })),
              timetableEntries: timetableEntries.map((entry) => ({
                ...entry,
                moduleTitle: state.modules.find((module) => module.id === entry.moduleId)?.title ?? null,
                moduleCode: state.modules.find((module) => module.id === entry.moduleId)?.code ?? null,
              })),
          },
        }),
      });

      const data = await response.json();

      if (data.action === 'switch_theme' && typeof data.theme === 'string' && isThemeId(data.theme)) {
        setTheme(data.theme);
      }

      if (data.action && onAction) {
        await onAction(data);
      } else if (data.action) {
        await refreshWorkspace();
      }

      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: data.text || 'Sorry, I encountered an error.',
        timestamp: new Date().toISOString(),
      };

      await saveGlobalChatMessage(modelMessage);

      const nextHistory = [...nextUserHistory, modelMessage];
      setActiveHistory(nextHistory);
      if (activeConvId) {
        updateConversation(activeConvId, (session) => ({
          ...session,
          history: [...(session.history || []), modelMessage],
          updatedAt: new Date().toISOString(),
        }));
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end p-0 md:p-2 max-md:items-start">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/56 backdrop-blur-sm"
      />

      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="workspace-chat-drawer relative z-[90] flex flex-col overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-med)]/96 text-[color:var(--text)] shadow-[0_10px_30px_rgba(0,0,0,0.38)] backdrop-blur-md"
        style={!isMobile ? { width: `${drawerWidth}px` } : undefined}
      >
        {!isMobile && (
          <div
            role="separator"
            aria-label="Resize chat panel"
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 z-30 h-full w-1.5 cursor-ew-resize bg-transparent hover:bg-[color:var(--accent)]/25"
          />
        )}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 icon-btn text-[color:var(--muted)] hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)]"
          aria-label="Close global chat"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-[color:var(--border)] px-3 py-2 pr-14 shrink-0 bg-[color:var(--surface-low)]/30">
          <Dropdown
            options={modelOptions}
            selectedId={model}
            onSelect={(id) => setModel(id as AIModelId)}
            placeholder="Select assistant model"
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className={`flex flex-col overflow-x-hidden border-r border-[color:var(--border)] bg-[color:var(--surface-low)]/40 shrink-0 transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-60' : 'w-12'}`}>
            <div className={`flex items-center justify-between gap-2 ${sidebarOpen ? 'border-b border-[color:var(--border)] px-2 py-2' : 'px-0 pt-3 pb-2 justify-center'}`}>
              {sidebarOpen ? (
                <>
                  <div className="min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Chats</div>
                  <button
                    type="button"
                    aria-label="Minimize chats sidebar"
                    onClick={() => setSidebarOpen(false)}
                    className="icon-btn shrink-0 text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  aria-label="Expand chats sidebar"
                  onClick={() => setSidebarOpen(true)}
                  className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className={`no-scrollbar flex-1 overflow-y-auto overflow-x-hidden ${sidebarOpen ? 'p-2' : 'pt-2'}`}>
              {sidebarOpen && conversations.map((session) => {
                const isActive = session.id === activeConvId;
                const initials = session.title?.trim()?.charAt(0)?.toUpperCase() || 'N';
                return (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectConversation(session)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectConversation(session);
                      }
                    }}
                    className={`group mb-2 flex w-full items-center gap-2 rounded-xl border text-left transition-colors ${sidebarOpen ? 'px-2 py-2' : 'justify-center px-1 py-1.5'} ${isActive ? 'border-[color:var(--border)] bg-[color:var(--surface-high)]/35' : 'border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--surface-med)]/60'}`}
                    title={session.title}
                  >
                    <div className={`flex shrink-0 items-center justify-center border text-sm font-semibold ${sidebarOpen ? 'h-9 w-9 rounded-lg' : 'h-8 w-8 rounded-full'} ${isActive ? 'border-[color:var(--border)] bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'border-[color:var(--border)] bg-[color:var(--surface-low)] text-[color:var(--muted)]'}`}>
                      {sidebarOpen ? initials : initials}
                    </div>

                    {sidebarOpen && (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[color:var(--text)]">{session.title || 'New chat'}</div>
                        <div className="text-[11px] text-[color:var(--muted)]">
                          {new Date(session.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {sidebarOpen && (
                      <button
                        type="button"
                        aria-label={`Delete chat ${session.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteConversation(session.id);
                        }}
                        className="icon-btn shrink-0 text-[color:var(--muted)] opacity-0 transition-opacity hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)] group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {!sidebarOpen && activeConversation && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectConversation(activeConversation)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectConversation(activeConversation);
                    }
                  }}
                  className="mx-auto mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--accent)] text-[color:var(--on-accent)] text-sm font-semibold shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
                  title={activeConversation.title || 'Active chat'}
                >
                  {(activeConversation.title || 'N').trim().charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className={`${sidebarOpen ? 'border-t border-[color:var(--border)] p-2' : 'px-0 pb-3 pt-2'}`}>
              <button
                type="button"
                onClick={handleNewConversation}
                className={`flex items-center justify-center bg-[color:var(--accent)] text-[color:var(--on-accent)] transition-transform hover:scale-[1.01] ${sidebarOpen ? 'h-10 w-full gap-2 rounded-xl px-3' : 'h-9 w-9 mx-auto rounded-full'}`}
                aria-label="New conversation"
                title="New conversation"
              >
                <Plus className="h-4.5 w-4.5" />
                {sidebarOpen && <span className="text-sm font-medium">New chat</span>}
              </button>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_42%)] px-4 py-4 text-sm leading-relaxed">
              {(activeHistory || []).length === 0 && (
                <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]/80">
                  <p className="text-sm font-bold text-[color:var(--text)] font-heading">Start a prompt</p>
                  <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
                    Ask anything about academic modules, events, daily prioritize tasks, or summarize readings.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setInput('What do I need to finish this week?')}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-high)]/60 px-3 py-1.5 text-[10px] text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] hover:border-[color:var(--border-focus)]/30"
                    >
                      Due this week
                    </button>
                    <button
                      onClick={() => setInput('Summarize my modules and file counts.')}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-high)]/60 px-3 py-1.5 text-[10px] text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] hover:border-[color:var(--border-focus)]/30"
                    >
                      Module summary
                    </button>
                  </div>
                </Card>
              )}

              {activeHistory.map((message) => (
                <div key={message.id} className={`flex min-w-0 gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm text-[9px] font-bold ${
                      message.role === 'user'
                        ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
                        : 'bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]'
                    }`}
                  >
                    {message.role === 'user' ? 'YOU' : <Sparkles className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={`min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm border ${
                      message.role === 'user'
                        ? 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--text)]'
                        : 'bg-[color:var(--surface-high)]/30 border-[color:var(--border)] text-[color:var(--text)]'
                    }`}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {message.attachments.map((att, index) => (
                          <div key={index} className="flex items-center gap-1.5 rounded-lg bg-[color:var(--surface-low)] px-2 py-1 text-[9px] font-medium border border-[color:var(--border)]">
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

              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)]/20 px-3.5 py-2 text-sm text-[color:var(--muted)]">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[color:var(--accent)]" /> Assistant is thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[color:var(--border)] px-4 py-3 shrink-0 bg-[color:var(--surface-low)]/70 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {attachments.map((att, index) => (
                    <div key={index} className="group relative flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-2.5 py-1.5 text-xs">
                      {att.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-[color:var(--accent)]" /> : <Paperclip className="h-3.5 w-3.5 text-[color:var(--accent)]" />}
                      <span className="max-w-[120px] truncate font-medium text-xs">{att.name}</span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                        className="ml-1 rounded-full p-0.5 text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(event) => {
                    const files = event.target.files;
                    if (!files) return;
                    Array.from(files).forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (loadEvent) => {
                        const base64 = loadEvent.target?.result as string;
                        setAttachments((current) => [...current, {
                          name: file.name,
                          type: file.type,
                          data: base64,
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
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about tasks, calendar, or modules..."
                    className="min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && attachments.length === 0)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-[color:var(--on-accent)] transition-all duration-150 ease hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
