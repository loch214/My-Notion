import React from 'react';
import { ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import { AppState, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { AI_MODELS, AIModelId, DEFAULT_AI_MODEL } from '../lib/models';

interface GlobalChatProps {
  onClose: () => void;
  state: AppState;
  updateState: (updates: (prev: AppState) => AppState) => void;
}

export function GlobalChat({ onClose, state, updateState }: GlobalChatProps) {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState(DEFAULT_AI_MODEL);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.globalChatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };

    updateState((prev) => ({ ...prev, globalChatHistory: [...prev.globalChatHistory, userMessage] }));
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: state.globalChatHistory,
          model,
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

      updateState((prev) => ({ ...prev, globalChatHistory: [...prev.globalChatHistory, modelMessage] }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-[430px] flex-col border-l border-subtle animate-fade-up md:w-[430px]">
      <div className="flex items-center justify-between border-b border-subtle px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Global assistant</p>
            <h2 className="text-base font-semibold">AI anywhere in the workspace</h2>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-white" aria-label="Close chat">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-subtle px-4 py-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as AIModelId)}
          className="surface-soft w-full rounded-2xl px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
        >
          {AI_MODELS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} · {option.badge}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm" ref={scrollRef}>
        {state.globalChatHistory.length === 0 && (
          <div className="surface rounded-3xl p-4 text-sm text-muted">
            <p className="text-base text-white">Start with a question about tasks, schedule, or modules.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setInput('What do I need to finish this week?')} className="surface-soft rounded-full px-3 py-1.5 text-xs transition hover:text-white">Due this week</button>
              <button onClick={() => setInput('Summarize my modules and file counts.')} className="surface-soft rounded-full px-3 py-1.5 text-xs transition hover:text-white">Module summary</button>
            </div>
          </div>
        )}

        {state.globalChatHistory.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-white text-slate-950' : 'bg-accent text-white'}`}>
              {message.role === 'user' ? <span className="text-xs font-bold">L</span> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] rounded-3xl border px-4 py-3 shadow-sm ${message.role === 'user' ? 'border-transparent bg-white text-slate-950' : 'border-subtle bg-white/5 text-white'}`}>
              <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-slate' : 'prose-invert'}`}>
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
            <div className="flex items-center rounded-3xl border border-subtle bg-white/5 px-4 py-3 text-sm text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent" />
              AI is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-subtle p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="surface-soft w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
            placeholder="Ask anything about your tasks, schedule, or files..."
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-xl bg-accent px-3 py-2 text-white transition hover:scale-[1.02] disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 text-center text-[10px] uppercase tracking-[0.24em] text-muted">
          Global memory · context aware · RAG-ready
        </div>
      </div>
    </div>
  );
}
