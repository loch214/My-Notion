import React from 'react';
import { ChevronRight, Loader2, Sparkles, X, ChevronDown, Plus, Paperclip, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { AppState, ChatMessage, ChatSession } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL } from '../lib/models';
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
}

export function GlobalChat({ onClose, state, saveGlobalChatMessage, refreshWorkspace }: GlobalChatProps) {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState<AIModelId>(DEFAULT_AI_MODEL);
  const [attachments, setAttachments] = React.useState<{ name: string; type: string; data: string }[]>([]);
  const { setTheme } = useTheme();
  const LOCAL_CONV_KEY = 'myNotion.globalChats';

  const [conversations, setConversations] = React.useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CONV_KEY);
      return raw ? (JSON.parse(raw) as ChatSession[]) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [activeHistory, setActiveHistory] = React.useState<ChatMessage[]>(state.globalChatHistory || []);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!conversations.length) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const newConv: ChatSession = { id, title: 'New chat', history: [], createdAt: now, updatedAt: now };
      setConversations([newConv]);
      setActiveConvId(id);
      setActiveHistory([]);
      try { localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify([newConv])); } catch (e) {}
    } else {
      // open a fresh conversation on mount while keeping older ones
      const id = uuidv4();
      const now = new Date().toISOString();
      const newConv: ChatSession = { id, title: 'New chat', history: [], createdAt: now, updatedAt: now };
      const next = [newConv, ...conversations];
      setConversations(next);
      setActiveConvId(id);
      setActiveHistory([]);
      try { localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(next)); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeHistory]);

  const modelOptions = AI_MODELS.map(m => ({ id: m.id, label: m.label, badge: m.badge }));

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    const userMessage: ChatMessage = { id: uuidv4(), role: 'user', text: input, timestamp: new Date().toISOString(), attachments: attachments.length ? [...attachments] : undefined };
    try {
      await saveGlobalChatMessage(userMessage);
    } catch (e) {}
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, history: [...(c.history||[]), userMessage], updatedAt: new Date().toISOString() } : c));
    setActiveHistory(prev => [...prev, userMessage]);
    setInput(''); setAttachments([]); setIsLoading(true);

    try {
      const resp = await fetch('/api/chat/global', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMessage.text, history: state.globalChatHistory, model, attachments, context: { tasks: state.tasks } }) });
      const data = await resp.json();
      if (data.action === 'switch_theme' && typeof data.theme === 'string' && isThemeId(data.theme)) setTheme(data.theme);
      const modelMessage: ChatMessage = { id: uuidv4(), role: 'model', text: data.text || 'Sorry, I encountered an error.', timestamp: new Date().toISOString() };
      try { await saveGlobalChatMessage(modelMessage); } catch (e) {}
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, history: [...(c.history||[]), modelMessage], updatedAt: new Date().toISOString() } : c));
      setActiveHistory(prev => [...prev, modelMessage]);
      if (data.action) await refreshWorkspace();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end p-0 md:p-2 max-md:items-start">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" />

      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }} className="workspace-chat-drawer relative z-50 flex flex-col w-full md:w-[560px] max-h-[92vh] overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-med)]/96 text-[color:var(--text)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

        <button onClick={onClose} aria-label="Close global chat" className="absolute right-3 top-3 icon-btn text-[color:var(--muted)] hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)] z-50"><X className="h-5 w-5" /></button>

        <div className="border-b border-[color:var(--border)] px-3 py-2 shrink-0 bg-[color:var(--surface-low)]/30">
          <Dropdown options={modelOptions} selectedId={model} onSelect={(id) => setModel(id as AIModelId)} placeholder="Select assistant model" />
        </div>

        <div className="flex-1 flex min-h-0">
          <div className={`relative flex flex-col ${sidebarOpen ? 'w-40' : 'w-10'} border-r border-[color:var(--border)] bg-[color:var(--surface-low)]/40 shrink-0 transition-all duration-200 ease-in-out overflow-hidden`}>
            <div className="flex items-center justify-between px-2 py-2 border-b border-[color:var(--border)]">
              <div className="text-xs font-semibold text-[color:var(--muted)]">{sidebarOpen ? 'Conversations' : ''}</div>
              <button aria-label="Toggle conversations sidebar" onClick={() => setSidebarOpen(prev => !prev)} className="icon-btn text-[color:var(--muted)]">
                <ChevronDown className={`h-4 w-4 transform ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            </div>
            {/* persistent vertical toggle tab placed outside the sidebar so it never overlaps header/footer */}
            <button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(prev => !prev)} className="absolute left-0 -translate-x-1/2 top-1/2 z-60 -translate-y-1/2 icon-btn bg-[color:var(--surface-low)]/95">
              <ChevronDown className={`h-4 w-4 transform ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            <div className="overflow-y-auto p-2 flex-1">
              {conversations.map(c => (
                <div key={c.id} onClick={() => { setActiveConvId(c.id); setActiveHistory(c.history || []); }} className={`mb-2 cursor-pointer rounded px-2 py-1 flex items-center gap-2 ${c.id === activeConvId ? 'bg-[color:var(--surface-high)]/30 border border-[color:var(--border)]' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-medium text-sm ${c.id === activeConvId ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--surface-low)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
                    {c.title ? c.title.charAt(0).toUpperCase() : 'N'}
                  </div>
                  {sidebarOpen && (
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.title || 'Untitled'}</div>
                      <div className="text-[11px] text-[color:var(--muted)]">{new Date(c.createdAt).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-2 py-2 border-t border-[color:var(--border)]">
              {sidebarOpen ? (
                <button onClick={() => { const id = uuidv4(); const now = new Date().toISOString(); const newConv: ChatSession = { id, title: 'New chat', history: [], createdAt: now, updatedAt: now }; const next = [newConv, ...conversations]; setConversations(next); setActiveConvId(id); setActiveHistory([]); try { localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(next)); } catch (e) {} }} className="w-full rounded-md py-2 px-3 bg-[color:var(--accent)] text-[color:var(--on-accent)]">New</button>
              ) : (
                <button aria-label="New conversation" onClick={() => { const id = uuidv4(); const now = new Date().toISOString(); const newConv: ChatSession = { id, title: 'New chat', history: [], createdAt: now, updatedAt: now }; const next = [newConv, ...conversations]; setConversations(next); setActiveConvId(id); setActiveHistory([]); try { localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(next)); } catch (e) {} }} className="icon-btn w-10 h-10 flex items-center justify-center rounded-md bg-[color:var(--accent)] text-[color:var(--on-accent)]"><Plus className="h-4 w-4" /></button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
              {(activeHistory || []).length === 0 && (
                <Card spotlight className="card-pad bg-[color:var(--surface-low)]/80">
                  <p className="text-sm font-bold">Start a prompt</p>
                  <p className="text-xs text-[color:var(--muted)] mt-1.5">Ask about tasks, calendar, or modules.</p>
                </Card>
              )}

              {(activeHistory || []).map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]'}`}>
                    {msg.role === 'user' ? 'YOU' : <Sparkles className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-4 py-2.5 border ${msg.role === 'user' ? 'bg-[color:var(--surface-low)]' : 'bg-[color:var(--surface-high)]/30'}`}>
                    <div className="prose prose-sm max-w-none break-words text-sm"><Markdown>{msg.text}</Markdown></div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]"><Sparkles className="h-3.5 w-3.5" /></div>
                  <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)]/20 px-3.5 py-2 text-sm text-[color:var(--muted)]"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[color:var(--accent)]" /> Assistant is thinking...</div>
                </div>
              )}
            </div>

            <div className="border-t border-[color:var(--border)] px-4 py-3 shrink-0 bg-[color:var(--surface-low)]/70">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={() => {}} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="icon-btn"><Plus className="h-4.5 w-4.5" /></button>
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_3rem] gap-2">
                  <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about tasks, calendar, or modules..." />
                  <button type="submit" disabled={isLoading || (!input.trim() && attachments.length === 0)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-[color:var(--on-accent)]"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
