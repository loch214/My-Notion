import React, { useState } from 'react';
import { Module } from '../types';
import { BookOpen, FileText, MessageSquare, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AcademicOverviewProps {
  modules: Module[];
  onOpenModule: (moduleId: string) => void;
  onAddModule: (title: string, code: string, color: Module['color']) => void;
}

export function AcademicOverview({ modules, onOpenModule, onAddModule }: AcademicOverviewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState<Module['color']>('blue');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'newest'>('newest');

  const getBadgeColors = (color: Module['color']) => {
    switch (color) {
      case 'amber': return 'bg-amber-100 text-amber-700';
      case 'blue': return 'bg-blue-100 text-blue-700';
      case 'emerald': return 'bg-emerald-100 text-emerald-700';
      case 'purple': return 'bg-purple-100 text-purple-700';
      case 'rose': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;
    onAddModule(newTitle, newCode, newColor);
    setIsAdding(false);
    setNewTitle('');
    setNewCode('');
    setNewColor('blue');
  };

  const sortedModules = [...modules].sort((a, b) => {
    if (sortOrder === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });
  
  if (sortOrder === 'newest') {
    sortedModules.reverse();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2 text-slate-900">Academic Overview</h1>
          <p className="text-slate-500">Manage your university modules, files, and AI study sessions.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-500">Sort by:</span>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
          >
            <option value="newest">Recently Added</option>
            <option value="alpha">Alphabetical (A-Z)</option>
          </select>
        </div>
      </header>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sortedModules.map((mod) => (
            <div 
              key={mod.id} 
              onClick={() => onOpenModule(mod.id)}
              className="group border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer bg-white flex flex-col"
            >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn('p-2 rounded-lg', getBadgeColors(mod.color))}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">{mod.code}</span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-indigo-600 transition-colors">{mod.title}</h3>
                <div className="flex items-center text-xs text-slate-500 space-x-3 mt-auto pt-4">
                  <span className="flex items-center"><FileText className="w-3 h-3 mr-1"/> {mod.files.length} files</span>
                  <span className="flex items-center"><MessageSquare className="w-3 h-3 mr-1"/> {Math.floor(mod.chatHistory.length / 2)} chats</span>
                </div>
            </div>
          ))}
          <div 
            onClick={() => setIsAdding(true)}
            className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer min-h-[140px]"
          >
              <span className="p-2 rounded-full bg-slate-100 mb-2 group-hover:bg-slate-200 transition-colors"><Plus className="w-5 h-5 text-slate-400" /></span>
              <span className="text-sm font-medium">New Module</span>
          </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Add New Module</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module Title</label>
                  <input required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} type="text" placeholder="e.g. Artificial Intelligence" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module Code</label>
                  <input required value={newCode} onChange={e => setNewCode(e.target.value)} type="text" placeholder="e.g. CS-301" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color Label</label>
                  <div className="flex gap-3">
                    {(['blue', 'amber', 'emerald', 'purple', 'rose'] as Module['color'][]).map(c => (
                      <div 
                        key={c} 
                        onClick={() => setNewColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border-2 transition-all",
                          newColor === c ? "border-slate-400 scale-110" : "border-transparent hover:scale-110",
                          c === 'blue' ? 'bg-blue-400' : c === 'amber' ? 'bg-amber-400' : c === 'emerald' ? 'bg-emerald-400' : c === 'purple' ? 'bg-purple-400' : 'bg-rose-400'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Create Module</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
