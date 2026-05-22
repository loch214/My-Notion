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
      case 'amber': return 'bg-amber-400/15 text-amber-300';
      case 'blue': return 'bg-sky-400/15 text-sky-300';
      case 'emerald': return 'bg-emerald-400/15 text-emerald-300';
      case 'purple': return 'bg-violet-400/15 text-violet-300';
      case 'rose': return 'bg-rose-400/15 text-rose-300';
      default: return 'bg-white/5 text-white';
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
    <div className="animate-fade-up text-white">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Academic space</p>
          <h1 className="mt-2 text-3xl font-semibold">Modules, files, and AI study rooms</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Create a module, then attach lecture files and study with a model of your choice.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sort</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="surface-soft rounded-2xl px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="newest">Recently added</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedModules.map((module) => (
          <button
            key={module.id}
            onClick={() => onOpenModule(module.id)}
            className="surface-soft group rounded-3xl p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className={cn('rounded-2xl p-3', getBadgeColors(module.color))}>
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">{module.code}</span>
            </div>
            <h3 className="text-xl font-semibold group-hover:text-white">{module.title}</h3>
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {module.files.length} files</span>
              <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {Math.floor(module.chatHistory.length / 2)} chats</span>
            </div>
          </button>
        ))}

        <button
          onClick={() => setIsAdding(true)}
          className="surface rounded-3xl border border-dashed border-white/15 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-accent">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-xl font-semibold">New module</h3>
          <p className="mt-1 text-sm text-muted">Create a fresh academic workspace.</p>
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in">
          <div className="surface-strong w-full max-w-lg rounded-[2rem] p-6 text-white">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Create module</p>
                <h2 className="mt-1 text-2xl font-semibold">Add a new academic space</h2>
              </div>
              <button onClick={() => setIsAdding(false)} className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-muted">Module title</label>
                <input
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  type="text"
                  placeholder="Artificial Intelligence"
                  className="surface-soft w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted">Module code</label>
                <input
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  type="text"
                  placeholder="CS-301"
                  className="surface-soft w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm text-muted">Accent color</label>
                <div className="flex flex-wrap gap-3">
                  {(['blue', 'amber', 'emerald', 'purple', 'rose'] as Module['color'][]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={cn(
                        'h-10 rounded-full px-4 text-sm font-medium transition',
                        newColor === color ? 'bg-white text-slate-950' : 'surface-soft text-muted'
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="surface-soft flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-muted transition hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                  Create module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
