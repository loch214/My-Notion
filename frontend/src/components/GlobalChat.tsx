import React from 'react';
import { Sparkles, ChevronRight, Loader2, X } from 'lucide-react';
import { AppState, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';

interface GlobalChatProps {
  onClose: () => void;
  state: AppState;
  updateState: (updates: (prev: AppState) => AppState) => void;
}

export function GlobalChat({ onClose, state, updateState }: GlobalChatProps) {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [model, setModel] = React.useState('gemini-2.5-flash');
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
      timestamp: new Date().toISOString()
    };

    updateState(prev => ({ ...prev, globalChatHistory: [...prev.globalChatHistory, userMessage] }));
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
            modules: state.modules.map(m => m.title)
          }
        })
      });
      
      const data = await response.json();
      
      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: data.text || 'Sorry, I encountered an error.',
        timestamp: new Date().toISOString()
      };

      updateState(prev => ({ ...prev, globalChatHistory: [...prev.globalChatHistory, modelMessage] }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-300">
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-indigo-50/30 text-indigo-900 border-l-[3px] border-l-indigo-500">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="font-semibold text-sm">AI Assistant</span>
          </div>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-[10px] uppercase tracking-wider font-semibold bg-white/50 border border-indigo-100 text-indigo-600 rounded py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="gemini-2.5-flash">Flash (Free)</option>
            <option value="gemini-2.5-pro">Pro</option>
          </select>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Close chat">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-slate-50/50" ref={scrollRef}>
        {state.globalChatHistory.length === 0 && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm text-slate-700">
              <p>Hi! I'm your global assistant. I know about your tasks, schedule, and uploaded modules.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setInput("What do I have due today?")} className="px-2.5 py-1 text-xs border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600 transition-colors">What's due today?</button>
                  <button onClick={() => setInput("What modules am I taking?")} className="px-2.5 py-1 text-xs border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600 transition-colors">My modules</button>
              </div>
            </div>
          </div>
        )}

        {state.globalChatHistory.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`shrink-0 mt-1 flex items-center justify-center w-6 h-6 rounded-full ${msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? 
                  <span className="text-xs font-bold text-white">L</span> : 
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                }
             </div>
             <div className={`p-3 rounded-2xl shadow-sm border max-w-[85%] overflow-hidden ${
               msg.role === 'user' 
                ? 'bg-slate-800 text-white border-transparent rounded-tr-sm' 
                : 'bg-white border-slate-200 text-slate-700 rounded-tl-sm'
             }`}>
               <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                 <Markdown>{msg.text}</Markdown>
               </div>
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="shrink-0 mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100">
                 <Sparkles className="w-3 h-3 text-indigo-600" />
             </div>
             <div className="p-3 bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm flex items-center">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mr-2" />
                <span className="text-xs text-slate-500">AI is thinking...</span>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-shadow"
              placeholder="Ask anything about your tasks, schedule, or files..."
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1.5 bottom-1.5 px-2 text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
        </form>
        <div className="text-[10px] text-center mt-2 text-slate-400">
          The AI uses RAG to access your uploaded module files and tasks.
        </div>
      </div>
    </div>
  );
}
