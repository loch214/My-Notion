import React, { useState } from 'react';
import { Module, Task } from '../types';
import { BookOpen, FileText, MessageSquare, Plus, ChevronDown, Calendar } from 'lucide-react';
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
}: AcademicOverviewProps) {
  const ACADEMIC_GENERAL_ID = '__academic__';
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState<Module['color']>('blue');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'newest'>('newest');

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
    <div className="animate-fade-up text-[color:var(--text)]">
      
      {/* 1. Header controls */}
      <SectionHeader
        title="Modules, files, and AI study rooms"
        subtitle="Create an academic module, then attach lecture slides or notes and study with your choose of grounded AI models."
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

      {/* 2. Top Stats Section */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-6 mb-8">
        {[
          { label: 'Total modules', value: modules.length, icon: BookOpen },
          { label: 'Uploaded files', value: totalFiles, icon: FileText },
          { label: 'Study chats', value: totalChats, icon: MessageSquare },
        ].map((stat) => (
          <Card key={stat.label} spotlight={true} className="p-4 bg-[color:var(--surface-low)] border border-[color:var(--border)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)] font-semibold">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-[color:var(--accent)]" />
            </div>
            <p className="mt-3 text-2xl font-bold font-heading text-[color:var(--text)]">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 mb-4">
        <h2 className="text-lg font-bold font-heading text-[color:var(--text)]">Your Modules</h2>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">Jump back into your interactive lecture spaces.</p>
      </div>

      {/* 3. Grid Columns with flexible stacks for medium screen */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        
        {/* Left Column: Modules Grid & Add Task */}
        <div className="space-y-6 min-w-0 flex-1 xl:flex-[1.3] xl:basis-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sortedModules.map((module) => (
              <Card
                key={module.id}
                spotlight={true}
                interactive={true}
                onClick={() => onOpenModule(module.id)}
                className="p-5 text-left bg-[color:var(--surface-low)]"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className={cn('rounded-xl p-2.5', getBadgeColors(module.color))}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[color:var(--muted)] font-mono">
                    {module.code}
                  </span>
                </div>
                <h3 className="text-base font-bold font-heading text-[color:var(--text)] line-clamp-1 group-hover:text-[color:var(--accent)] transition-colors">
                  {module.title}
                </h3>
                <div className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {module.files.length} files</span>
                  <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {Math.floor((module.chatHistory || []).length / 2)} chats</span>
                </div>
              </Card>
            ))}
            {sortedModules.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-[color:var(--muted)] rounded-2xl border border-dashed border-[color:var(--border)]">
                No active modules. Create your first module above.
              </div>
            )}
          </div>

          {/* Quick Task Creation primitive container */}
          <Card spotlight={false} className="p-5 bg-[color:var(--surface-low)]">
            <TaskList
              tasks={academicTasks}
              onToggleTask={onToggleTask}
              onAddTask={(title, dueDate) => onAddTask(title, dueDate, ACADEMIC_GENERAL_ID)}
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              showAddControls={true}
              showTaskGroups={false}
              title="Quick Add Academic Task"
            />
          </Card>
        </div>

        {/* Right Column: Academic Agenda */}
        <div className="space-y-4 min-w-0 flex-1 xl:flex-[0.9] xl:basis-0">
          <div className="flex items-center gap-2 text-base font-bold font-heading text-[color:var(--text)] pl-1">
            <Calendar className="h-4.5 w-4.5 text-[color:var(--accent)]" /> 
            Academic Agenda
          </div>
          <Card spotlight={false} className="p-5 bg-[color:var(--surface-low)]">
            <TaskList
              tasks={academicTasks}
              onToggleTask={onToggleTask}
              onAddTask={(title, dueDate) => onAddTask(title, dueDate, ACADEMIC_GENERAL_ID)}
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              showAddControls={false}
              showTaskGroups={true}
              title="Academic Todo"
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
                    'h-9 rounded-full px-4 text-xs font-semibold transition-all border',
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

    </div>
  );
}
