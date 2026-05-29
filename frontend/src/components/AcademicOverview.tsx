import React, { useState } from 'react';
import { Module, Task } from '../types';
import { BookOpen, FileText, MessageSquare, Plus, ChevronDown, Calendar, Edit, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskList } from './TaskList';

// Import UI primitives
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { Modal } from './ui/Modal';
import { SectionHeader } from './ui/SectionHeader';

interface AcademicOverviewProps {
  modules: Module[];
  tasks: Task[];
  onOpenModule: (moduleId: string) => void;
  onAddModule: (title: string, code: string, color: Module['color']) => void;
  onEditModule?: (moduleId: string, updates: Partial<Module>) => void;
  onRemoveModule?: (moduleId: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate?: string, moduleId?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
}

export function AcademicOverview({
  modules,
  tasks = [],
  onOpenModule,
  onAddModule,
  onToggleTask,
  onAddTask,
  onEditTask,
  onRemoveTask,
  onEditModule,
  onRemoveModule,
}: AcademicOverviewProps) {
  const ACADEMIC_GENERAL_ID = '__academic__';
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState<Module['color']>('blue');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'newest'>('newest');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editColor, setEditColor] = useState<Module['color']>('blue');

  const getBadgeColors = (color: Module['color']) => {
    switch (color) {
      case 'amber': return 'module-badge-amber';
      case 'blue': return 'module-badge-blue';
      case 'emerald': return 'module-badge-emerald';
      case 'purple': return 'module-badge-purple';
      case 'rose': return 'module-badge-rose';
      default: return 'bg-[color:var(--surface-low)] text-[color:var(--text)]';
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
  const totalChats = modules.reduce((sum, module) => sum + Math.floor((module.chatHistory || []).length / 2), 0);
  const academicTasks = tasks.filter((task) => task.moduleId === ACADEMIC_GENERAL_ID);

  const sortOptions = [
    { id: 'newest', label: 'Recently added' },
    { id: 'alpha', label: 'Alphabetical' }
  ];

  return (
    <div className="text-[color:var(--text)]">
      <SectionHeader
        className="mb-4"
        title="Academic"
        subtitle="Modules first, tasks always within reach."
        category="Academic Space"
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-nowrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              New module
            </Button>
            <div className="w-full sm:w-40">
              <Dropdown
                options={sortOptions}
                selectedId={sortOrder}
                onSelect={(id) => setSortOrder(id as any)}
                placeholder="Sort modules"
              />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.82fr)] xl:items-start">
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Modules', value: modules.length, icon: BookOpen },
              { label: 'Files', value: totalFiles, icon: FileText },
              { label: 'Chats', value: totalChats, icon: MessageSquare },
            ].map((stat) => (
              <Card key={stat.label} spotlight={true} className="card-pad bg-[color:var(--surface-low)]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)] font-semibold">{stat.label}</p>
                  <stat.icon className="h-4.5 w-4.5 text-[color:var(--accent)]" />
                </div>
                <p className="mt-2 text-2xl font-bold font-heading text-[color:var(--text)] sm:text-[2rem]">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-heading text-[color:var(--text)]">Modules</h2>
              <p className="text-sm text-[color:var(--muted)] mt-0.5">Three across on large screens.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {sortedModules.map((module) => (
              <Card
                key={module.id}
                spotlight={true}
                interactive={true}
                onClick={() => onOpenModule(module.id)}
                className="card-pad text-left bg-[color:var(--surface-low)] relative"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className={cn('rounded-xl p-2.5', getBadgeColors(module.color))}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[color:var(--muted)] font-mono">
                    {module.code}
                  </span>
                </div>
                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingModule(module); setEditTitle(module.title); setEditCode(module.code); setEditColor(module.color); }}
                    className="rounded-full p-1 text-[color:var(--muted)] opacity-80 transition-all duration-150 ease hover:opacity-100 hover:bg-[color:var(--surface-med)]"
                    aria-label="Edit module"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onRemoveModule) return;
                      if (confirm(`Delete module "${module.title}"? This cannot be undone.`)) {
                        onRemoveModule(module.id);
                      }
                    }}
                    className="rounded-full p-1 text-[color:var(--muted)] opacity-80 transition-all duration-150 ease hover:opacity-100 hover:bg-[color:var(--surface-med)]"
                    aria-label="Delete module"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-base font-bold font-heading text-[color:var(--text)] line-clamp-1 group-hover:text-[color:var(--accent)] transition-all duration-150 ease">
                  {module.title}
                </h3>
                <div className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {module.files.length}</span>
                  <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {Math.floor((module.chatHistory || []).length / 2)}</span>
                </div>
              </Card>
            ))}
            {sortedModules.length === 0 && (
              <div className="col-span-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)]/35 py-12 text-center text-xs text-[color:var(--muted)]">
                No active modules yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 min-w-0 xl:sticky xl:top-4">
          <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
              <Plus className="h-3.5 w-3.5 text-[color:var(--accent)]" />
              Quick task
            </div>
            <TaskList
              tasks={academicTasks}
              onToggleTask={onToggleTask}
              onAddTask={(title, dueDate) => onAddTask(title, dueDate, ACADEMIC_GENERAL_ID)}
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              showAddControls={true}
              showTaskGroups={false}
              title="Add task"
            />
          </Card>

          <div className="flex items-center gap-2 text-base font-bold font-heading text-[color:var(--text)] pl-1">
            <Calendar className="h-4.5 w-4.5 text-[color:var(--accent)]" />
            Academic Agenda
          </div>
          <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
            <TaskList
              tasks={academicTasks}
              onToggleTask={onToggleTask}
              onAddTask={(title, dueDate) => onAddTask(title, dueDate, ACADEMIC_GENERAL_ID)}
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              showAddControls={false}
              showTaskGroups={true}
              title="Academic Tasks"
            />
          </Card>
        </div>
      </div>

      {/* 4. Add module Modal primitive */}
      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add academic space"
        subtitle="Create module"
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Module Title</label>
            <Input
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Artificial Intelligence"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Module Code</label>
            <Input
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CS-301"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Theme Color</label>
            <div className="flex flex-wrap gap-2">
              {(['blue', 'amber', 'emerald', 'purple', 'rose'] as Module['color'][]).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={cn(
                    'h-9 rounded-full px-4 text-xs font-semibold transition-all duration-150 ease border',
                    newColor === color
                      ? 'bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--on-accent)] shadow-sm'
                      : 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)]'
                  )}
                >
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create Space
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit module Modal */}
      <Modal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        title="Edit module"
        subtitle="Update module details"
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!editingModule || !onEditModule) return;
          onEditModule(editingModule.id, { title: editTitle, code: editCode, color: editColor });
          setEditingModule(null);
        }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Module Title</label>
            <Input
              required
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Module Code</label>
            <Input
              required
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">Theme Color</label>
            <div className="flex flex-wrap gap-2">
              {(['blue', 'amber', 'emerald', 'purple', 'rose'] as Module['color'][]).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditColor(color)}
                  className={cn(
                    'h-9 rounded-full px-4 text-xs font-semibold transition-all duration-150 ease border',
                    editColor === color
                      ? 'bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--on-accent)] shadow-sm'
                      : 'bg-[color:var(--surface-low)] border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)]'
                  )}
                >
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditingModule(null)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
