import React, { useState } from 'react';
import { Module } from '../types';
import { BookOpen, FileText, MessageSquare, Plus, X, ChevronDown } from 'lucide-react';
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
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const getBadgeColors = (color: Module['color']) => {
    switch (color) {
      case 'amber': return 'module-badge-amber';
      case 'blue': return 'module-badge-blue';
      case 'emerald': return 'module-badge-emerald';
      case 'purple': return 'module-badge-purple';
      case 'rose': return 'module-badge-rose';
      default: return 'surface-soft text-[color:var(--text)]';
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

  const totalFiles = modules.reduce((sum, module) => sum + module.files.length, 0);
  const totalChats = modules.reduce((sum, module) => sum + Math.floor(module.chatHistory.length / 2), 0);

  return (
    <div className="animate-fade-up text-[color:var(--text)]">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Academic space</p>
          <h1 className="mt-2 text-3xl font-semibold">Modules, files, and AI study rooms</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Create a module, then attach lecture files and study with a model of your choice.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="btn-primary px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> New module
          </button>
          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
            >
              Sort: {sortOrder === 'newest' ? 'Recently added' : 'Alphabetical'}
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {isSortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortDropdownOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl surface border border-subtle shadow-xl p-1.5">
                  {[
                    { id: 'newest', label: 'Recently added' },
                    { id: 'alpha', label: 'Alphabetical' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortOrder(option.id as any);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${sortOrder === option.id ? 'bg-accent text-white font-medium' : 'text-[color:var(--text)] hover:surface-soft'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total modules', value: modules.length, icon: BookOpen },
          { label: 'Uploaded files', value: totalFiles, icon: FileText },
          { label: 'Study chats', value: totalChats, icon: MessageSquare },
        ].map((stat) => (
          <div key={stat.label} className="surface-soft rounded-3xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--text)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modules</h2>
          <p className="text-sm text-muted">Jump back into your latest study spaces.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedModules.map((module) => (
          <button
            key={module.id}
            onClick={() => onOpenModule(module.id)}
            className="surface-soft group rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className={cn('rounded-2xl p-3', getBadgeColors(module.color))}>
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-subtle px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">{module.code}</span>
            </div>
            <h3 className="text-xl font-semibold group-hover:text-accent transition-colors">{module.title}</h3>
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {module.files.length} files</span>
              <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {Math.floor(module.chatHistory.length / 2)} chats</span>
            </div>
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in">
          <div className="surface-strong w-full max-w-lg rounded-[2rem] p-6 text-[color:var(--text)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Create module</p>
                <h2 className="mt-1 text-2xl font-semibold">Add a new academic space</h2>
              </div>
              <button onClick={() => setIsAdding(false)} className="rounded-full p-2 text-muted transition hover:surface-soft hover:text-[color:var(--text)]">
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
                  className="surface-soft w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
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
                  className="surface-soft w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
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
                        newColor === color ? 'bg-[color:var(--text)] text-[color:var(--app-bg)]' : 'surface-soft text-muted'
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1 px-4 py-3 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 px-4 py-3 text-sm font-semibold">
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
