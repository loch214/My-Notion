import React from 'react';
import { ChevronRight, Loader2, Sparkles, X, ChevronDown, Plus, Paperclip, Image as ImageIcon } from 'lucide-react';
import { AppState, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL } from '../lib/models';

interface GlobalChatProps {
  onClose: () => void;
  state: AppState;
  saveGlobalChatMessage: (message: ChatMessage) => Promise<void>;
}

export function GlobalChat({ onClose, state, saveGlobalChatMessage }: GlobalChatProps) {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState(DEFAULT_AI_MODEL);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);
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

  return (
    <div className="surface-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-[430px] flex-col border-l border-subtle animate-fade-up md:w-[430px] text-[color:var(--text)]">
      <div className="flex items-center justify-between border-b border-subtle px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-black/20">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Global assistant</p>
            <h2 className="text-base font-semibold">AI anywhere in the workspace</h2>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:surface-soft hover:text-[color:var(--text)]" aria-label="Close chat">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-subtle px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="surface-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
          >
            {AI_MODELS.find(m => m.id === model)?.label} · {AI_MODELS.find(m => m.id === model)?.badge}
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {isModelDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)} />
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl surface border border-subtle shadow-xl p-1.5">
                {AI_MODELS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setModel(option.id as AIModelId);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${model === option.id ? 'bg-accent text-white font-medium' : 'text-[color:var(--text)] hover:surface-soft'}`}
                  >
                    {option.label} · <span className={model === option.id ? 'text-indigo-100' : 'text-muted'}>{option.badge}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm" ref={scrollRef}>
        {state.globalChatHistory.length === 0 && (
          <div className="surface rounded-3xl p-4 text-sm text-muted">
            <p className="text-base text-[color:var(--text)]">Start with a question about tasks, schedule, or modules.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setInput('What do I need to finish this week?')} className="surface-soft rounded-full px-3 py-1.5 text-xs transition hover:text-[color:var(--text)]">Due this week</button>
              <button onClick={() => setInput('Summarize my modules and file counts.')} className="surface-soft rounded-full px-3 py-1.5 text-xs transition hover:text-[color:var(--text)]">Module summary</button>
            </div>
          </div>
        )}

        {state.globalChatHistory.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
            <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm ${message.role === 'user' ? 'bg-accent text-white' : 'bg-surface-strong text-accent border border-subtle'}`}>
              {message.role === 'user' ? <span className="text-[10px] font-bold">YOU</span> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
              message.role === 'user' 
                ? 'surface-strong text-[color:var(--text)] border border-subtle' 
                : 'surface-soft text-[color:var(--text)] border border-subtle'
            }`}>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg bg-black/10 px-2 py-1 text-[10px] font-medium backdrop-blur-sm">
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

        {isLoading && (
          <div className="flex gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center rounded-3xl border border-subtle surface-soft px-4 py-3 text-sm text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent" />
              AI is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-subtle p-4">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 px-2">
            {attachments.map((att, i) => (
              <div key={i} className="group relative flex items-center gap-2 rounded-xl border border-subtle surface-soft px-3 py-1.5 text-xs animate-fade-in">
                {att.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-accent" /> : <Paperclip className="h-3.5 w-3.5 text-accent" />}
                <span className="max-w-[120px] truncate font-medium">{att.name}</span>
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, index) => index !== i))}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 text-muted hover:text-[color:var(--text)]"
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl surface-soft border border-subtle text-muted transition hover:surface-strong hover:text-[color:var(--text)]"
            title="Attach images or files"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="surface-soft w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
              placeholder="Ask anything about your tasks, schedule, or files..."
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-xl bg-accent px-3 py-2 text-white transition hover:scale-[1.02] disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
        <div className="mt-2 text-center text-[10px] uppercase tracking-[0.24em] text-muted">
          Global memory · context aware · RAG-ready
        </div>
      </div>
    </div>
  );
}
