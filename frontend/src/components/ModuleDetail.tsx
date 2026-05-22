import React, { useState } from 'react';
import { Module, UploadedFile, ChatMessage } from '../types';
import { ChevronLeft, FileText, Upload, FileUp, Sparkles, MessageSquare, Loader2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';

interface ModuleDetailProps {
  module: Module;
  onBack: () => void;
  updateModule: (moduleId: string, updates: Partial<Module>) => void;
}

export function ModuleDetail({ module, onBack, updateModule }: ModuleDetailProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'chat'>('files');
  const [isUploading, setIsUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState('gemini-2.5-flash');
  const [fileSort, setFileSort] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && activeTab === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [module.chatHistory, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.id) {
        const newFile: UploadedFile = {
          id: data.id,
          name: data.name,
          size: data.size,
          geminiFileUri: data.geminiFileUri,
          uploadedAt: new Date().toISOString()
        };
        updateModule(module.id, { files: [...module.files, newFile] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: chatInput,
      timestamp: new Date().toISOString()
    };
    
    const newHistory = [...module.chatHistory, userMessage];
    updateModule(module.id, { chatHistory: newHistory });
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat/module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          moduleName: module.title,
          history: module.chatHistory,
          files: module.files,
          model: chatModel
        })
      });
      const data = await res.json();
      
      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: data.text || 'Error generating response',
        timestamp: new Date().toISOString()
      };
      
      updateModule(module.id, { chatHistory: [...newHistory, modelMessage] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <header className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 flex items-center transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Overview
          </button>
          <div className="flex items-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mr-4">{module.title}</h1>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded">{module.code}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex justify-between items-end border-b border-slate-200 mb-6 shrink-0">
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('files')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'files' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Context Files</div>
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'chat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Study Assistant</div>
          </button>
        </div>
        
        {activeTab === 'chat' && (
           <select 
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="mb-2 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="gemini-2.5-flash">Gemini Flash (Free)</option>
              <option value="gemini-2.5-pro">Gemini Pro</option>
            </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto pb-8 animate-in slide-in-from-bottom-2">
             <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  {isUploading ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" /> : <Upload className="w-5 h-5 text-indigo-600" />}
                </div>
                <h3 className="font-medium text-slate-900 mb-1">Upload lecture notes or reading materials</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-sm">The AI will read these PDFs/DOCXs to help you answer questions contextually.</p>
                <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm">
                  <span>Select Files</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
                </label>
             </div>

             <div className="flex justify-between items-center mb-4">
               <h3 className="font-medium text-slate-800">Uploaded Files ({module.files.length})</h3>
               <select
                 value={fileSort}
                 onChange={(e) => setFileSort(e.target.value as any)}
                 className="text-xs font-medium border border-slate-200 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-600"
               >
                 <option value="newest">Newest First</option>
                 <option value="oldest">Oldest First</option>
                 <option value="alpha">Alphabetical</option>
               </select>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...module.files].sort((a, b) => {
                  if (fileSort === 'alpha') return a.name.localeCompare(b.name);
                  if (fileSort === 'oldest') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                  return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
                }).map(f => (
                  <div key={f.id} className="group border border-slate-200 bg-white rounded-lg p-4 flex items-start shadow-sm hover:shadow-md transition-shadow relative">
                    <FileUp className="w-8 h-8 text-rose-500 bg-rose-50 p-1.5 rounded mr-3 shrink-0" />
                    <div className="min-w-0 pr-6">
                      <p className="font-medium text-sm text-slate-800 truncate" title={f.name}>{f.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(f.size / 1024 / 1024).toFixed(2)} MB • {new Date(f.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => {
                        updateModule(module.id, { files: module.files.filter(file => file.id !== f.id) });
                      }}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {module.files.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm">No files uploaded yet.</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
              {module.chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center h-full max-w-sm mx-auto text-slate-500">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                    <Sparkles className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">Module AI Assistant</h3>
                  <p className="text-sm">Ask me to summarize uploaded lectures, explain concepts, or generate flashcards based on your {module.code} files.</p>
                </div>
              )}
              {module.chatHistory.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-100 border border-indigo-200'}`}>
                     {msg.role === 'user' ? <span className="text-sm font-bold text-white">L</span> : <Sparkles className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className={`p-4 rounded-2xl max-w-[80%] text-sm shadow-sm overflow-hidden leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center text-sm text-slate-600">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mr-2" /> AI is synthesizing...
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2 max-w-4xl mx-auto items-end">
                <textarea 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-32 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-700"
                  rows={2}
                  placeholder="Ask a question about the uploaded materials..."
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="shrink-0 p-3 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center mt-3 text-[11px] text-slate-400 font-medium">
                Responses are generated by AI grounded in your {module.files.length} uploaded files.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
