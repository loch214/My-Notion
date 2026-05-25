import React from 'react';
import { ChevronRight, Loader2, Sparkles, X, ChevronDown, Plus, Paperclip, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { AppState, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL } from '../lib/models';

// Import UI primitives
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';

interface GlobalChatProps {
  onClose: () => void;
  state: AppState;
  saveGlobalChatMessage: (message: ChatMessage) => Promise<void>;
}

export function GlobalChat({ onClose, state, saveGlobalChatMessage }: GlobalChatProps) {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState<AIModelId>(DEFAULT_AI_MODEL);
  const [attachments, setAttachments] = React.useState<{ name: string; type: string; data: string }[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.globalChatHistory]);

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    saveGlobalChatMessage(userMessage);
    const currentInput = input;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          history: state.globalChatHistory,
          model,
          attachments: currentAttachments,
          context: {
            tasks: state.tasks,
            events: state.events,
            modules: state.modules.map((module) => ({
              title: module.title,
              code: module.code,
              fileCount: module.files.length,
            })),
          },
        }),
      });

      const data = await response.json();

      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: data.text || 'Sorry, I encountered an error.',
        timestamp: new Date().toISOString(),
      };

      saveGlobalChatMessage(modelMessage);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const modelOptions = AI_MODELS.map(m => ({
    id: m.id,
    label: m.label,
    badge: m.badge
  }));

  // Detect viewport size for responsive slide drawer
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 768);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      {/* Slide Drawer Content */}
      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 flex h-[100dvh] w-full flex-col border-l border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--text)] md:w-[430px] shadow-2xl shadow-black/50"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-4 shrink-0 bg-[color:var(--surface-low)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)] font-medium">Global assistant</p>
              <h2 className="text-base font-bold font-heading text-[color:var(--text)]">AI anywhere in My-Notion</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 rounded-full text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)]" 
            aria-label="Close global chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Model dropdown indicator */}
        <div className="border-b border-[color:var(--border)] px-4 py-3 shrink-0 bg-[color:var(--surface-low)]/20">
          <Dropdown
            options={modelOptions}
            selectedId={model}
            onSelect={(id) => setModel(id as AIModelId)}
            placeholder="Select assistant model"
          />
        </div>

        {/* Messages listing */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 text-xs leading-relaxed" ref={scrollRef}>
          {state.globalChatHistory.length === 0 && (
            <Card spotlight={true} className="card-pad bg-[color:var(--surface-low)]/80">
              <p className="text-sm font-bold text-[color:var(--text)] font-heading">Start standard prompt runs</p>
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

          {state.globalChatHistory.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm text-[9px] font-bold ${
                message.role === 'user' 
                  ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' 
                  : 'bg-[color:var(--surface-low)] text-[color:var(--accent)] border border-[color:var(--border)]'
              }`}>
                {message.role === 'user' ? 'YOU' : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                message.role === 'user' 
                  ? 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--text)]' 
                  : 'bg-[color:var(--surface-high)]/30 border-[color:var(--border)] text-[color:var(--text)]'
              }`}>
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
                <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
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
              <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)]/20 px-3.5 py-2 text-xs text-[color:var(--muted)]">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[color:var(--accent)]" /> Assistant is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input box footer */}
        <div className="border-t border-[color:var(--border)] p-4 shrink-0 bg-[color:var(--surface-low)]/50 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 px-1">
              {attachments.map((att, i) => (
                <div key={i} className="group relative flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-2.5 py-1.5 text-xs">
                  {att.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-[color:var(--accent)]" /> : <Paperclip className="h-3.5 w-3.5 text-[color:var(--accent)]" />}
                  <span className="max-w-[120px] truncate font-medium text-[11px]">{att.name}</span>
                  <button 
                    onClick={() => setAttachments(prev => prev.filter((_, index) => index !== i))}
                    className="ml-1 rounded-full p-0.5 text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex gap-2 items-center">
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
                    setAttachments(current => [...current, {
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-med)] border border-[color:var(--border)] text-[color:var(--muted)] transition-all duration-150 ease hover:text-[color:var(--text)] hover:bg-[color:var(--surface-high)]"
              title="Attach images or slides"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about tasks, calendar, or modules..."
                className="pr-12"
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[color:var(--accent)] text-[color:var(--on-accent)] transition-all duration-150 ease hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
          <div className="mt-2.5 text-center text-[9px] uppercase tracking-[0.2em] text-[color:var(--muted)] opacity-60">
            Unified workspace AI · dynamic context memory
          </div>
        </div>

      </motion.div>
    </div>
  );
}
