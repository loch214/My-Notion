import React, { useState } from 'react';
import { Task, Event } from '../types';
import { Calendar, CheckSquare, Clock, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface PersonalDashboardProps {
  tasks: Task[];
  events: Event[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, priority: 'high' | 'medium' | 'low') => void;
}

export function PersonalDashboard({ tasks, events, onToggleTask, onAddTask }: PersonalDashboardProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle, newTaskPriority);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setIsAddingTask(false);
  };

  return (
    <div className="animate-fade-up text-white">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Personal space</p>
        <h1 className="mt-2 text-3xl font-semibold">Tasks, events, and daily focus</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Track what needs attention today without leaving the workspace.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckSquare className="h-5 w-5 text-accent" /> Today's tasks
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={cn(
                  'surface-soft flex w-full items-center rounded-3xl px-4 py-4 text-left transition hover:-translate-y-0.5',
                  task.done ? 'opacity-55' : ''
                )}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  readOnly
                  className="mr-4 h-4 w-4 rounded border-white/20 text-accent focus:ring-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', task.done ? 'text-muted line-through' : 'text-white')}>
                    {task.title}
                  </p>
                </div>
                {task.priority === 'high' && !task.done && <span className="mx-3 h-2 w-2 rounded-full bg-rose-400" />}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" /> {task.time}
                </div>
              </button>
            ))}

            {isAddingTask ? (
              <form onSubmit={handleAddTask} className="surface rounded-3xl p-4">
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="surface-soft mb-3 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="surface-soft rounded-2xl px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAddingTask(false)} className="surface-soft rounded-2xl px-4 py-2 text-sm text-muted transition hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                      Save task
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingTask(true)}
                className="surface-soft flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 px-4 py-4 text-sm text-muted transition hover:text-white"
              >
                <Plus className="h-4 w-4" /> Add new task
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-accent" /> Upcoming
          </div>

          <div className="surface-strong rounded-[2rem] overflow-hidden">
            <div className="border-b border-subtle px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted">Tomorrow</div>
            </div>
            <div className="relative space-y-4 p-4">
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-white/10" />
              {events.map((event) => (
                <div key={event.id} className="group relative flex items-start">
                  <div
                    className={cn(
                      'relative z-10 mr-4 mt-1 h-3 w-3 rounded-full border-2 border-black/30 shadow-sm',
                      event.color === 'blue' ? 'bg-sky-400' : event.color === 'amber' ? 'bg-amber-400' : 'bg-violet-400'
                    )}
                  />
                  <div className="transition group-hover:translate-x-1">
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{event.startTime} - {event.endTime}</p>
                    {event.description && (
                      <p className="mt-1 max-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-muted">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
