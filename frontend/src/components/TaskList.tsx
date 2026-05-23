import React, { useState } from 'react';
import { Task } from '../types';
import { CheckSquare, Clock, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, priority: 'high' | 'medium' | 'low', dueDate?: string) => void;
  title?: string;
  icon?: React.ElementType;
}

export function TaskList({ tasks, onToggleTask, onAddTask, title = "Tasks", icon: Icon = CheckSquare }: TaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle, newTaskPriority, newTaskDueDate || undefined);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  const groupTasks = () => {
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const upcoming: Task[] = [];
    const noDate: Task[] = [];

    tasks.forEach(task => {
      if (!task.dueDate) {
        noDate.push(task);
      } else {
        const date = parseISO(task.dueDate);
        if (isToday(date) || (isPast(date) && !task.done)) {
          today.push(task);
        } else if (isTomorrow(date)) {
          tomorrow.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    return { today, tomorrow, upcoming, noDate };
  };

  const { today, tomorrow, upcoming, noDate } = groupTasks();

  const renderGroup = (label: string, groupTasks: Task[]) => {
    if (groupTasks.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted ml-2">{label}</h3>
        <div className="space-y-3">
          {groupTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onToggleTask(task.id)}
              className={cn(
                'surface-soft flex w-full items-center rounded-3xl px-4 py-3 text-left transition hover:-translate-y-0.5',
                task.done ? 'opacity-55' : ''
              )}
            >
              <input
                type="checkbox"
                checked={task.done}
                readOnly
                className="mr-4 h-4 w-4 rounded border-subtle text-accent focus:ring-[color:var(--accent)]/40"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', task.done ? 'text-muted line-through' : 'text-[color:var(--text)]')}>
                  {task.title}
                </p>
              </div>
              {task.priority === 'high' && !task.done && <span className="mx-3 h-2 w-2 rounded-full bg-rose-400" />}
              {task.dueDate && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-subtle surface-soft px-3 py-1.5 text-xs text-muted ml-2">
                  <CalendarIcon className="h-3.5 w-3.5" /> {format(parseISO(task.dueDate), 'MMM d')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5 text-accent" /> {title}
        </div>
        {!isAddingTask && (
          <button
            onClick={() => setIsAddingTask(true)}
            className="btn-secondary px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </div>

      <div className="space-y-2">
        {renderGroup("Today & Overdue", today)}
        {renderGroup("Tomorrow", tomorrow)}
        {renderGroup("Upcoming", upcoming)}
        {renderGroup("No Date", noDate)}

        {isAddingTask ? (
          <form onSubmit={handleAddTask} className="surface rounded-3xl p-4 mt-2">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="surface-soft mb-3 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40 text-[color:var(--text)]"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="surface-soft rounded-2xl pl-3 pr-8 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40"
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="surface-soft rounded-2xl px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[color:var(--accent)]/40 text-[color:var(--text)]"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAddingTask(false)} className="btn-secondary px-4 py-2 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 text-sm font-semibold">
                  Save task
                </button>
              </div>
            </div>
          </form>
        ) : tasks.length === 0 ? (
          <div className="surface-soft rounded-3xl border border-dashed border-subtle px-4 py-6 text-center">
            <p className="text-sm text-muted">No tasks yet. Start with your next priority.</p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="btn-primary mt-4 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add first task
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}