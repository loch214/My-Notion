import React, { useMemo } from 'react';
import { Task, Event } from '../types';
import { Calendar, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskList } from './TaskList';
import { format, isAfter, isToday, parseISO, startOfDay } from 'date-fns';

interface PersonalDashboardProps {
  tasks: Task[];
  events: Event[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
}

export function PersonalDashboard({ tasks, events, onToggleTask, onAddTask, onEditTask, onRemoveTask }: PersonalDashboardProps) {

  const completedCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - completedCount;
  const upcomingTasks = useMemo(
    () => tasks
      .filter((task) => task.moduleId === undefined && task.dueDate && !task.done)
      .filter((task) => {
        const dueDate = parseISO(task.dueDate as string);
        return isToday(dueDate) || isAfter(dueDate, startOfDay(new Date()));
      })
      .sort((a, b) => parseISO(a.dueDate as string).getTime() - parseISO(b.dueDate as string).getTime())
      .slice(0, 6),
    [tasks]
  );

  return (
    <div className="animate-fade-up text-[color:var(--text)]">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Personal space</p>
        <h1 className="mt-2 text-3xl font-semibold">Tasks, events, and daily focus</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Track what needs attention today without leaving the workspace.</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Open tasks', value: openCount, icon: CheckSquare },
          { label: 'Completed', value: completedCount, icon: CheckSquare },
          { label: 'Upcoming events', value: events.length, icon: Calendar },
        ].map((stat, index) => (
          <div key={`${stat.label}-${index}`} className="surface-soft rounded-3xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--text)]">{stat.value}</p>
          </div>
        ))}
      </div>

          <div className="space-y-8">
            <TaskList 
              tasks={tasks.filter(t => !t.moduleId)} 
              onToggleTask={onToggleTask} 
              onAddTask={(title, dueDate) => onAddTask(title, dueDate)} 
              onEditTask={onEditTask}
              onRemoveTask={onRemoveTask}
              title="Personal Tasks" 
            />

            <div>
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-accent" /> Upcoming tasks
              </div>

              <div className="surface-strong rounded-[2rem] overflow-hidden">
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {upcomingTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className={cn(
                          'surface-soft flex w-full items-center justify-between rounded-3xl px-4 py-3 text-left transition hover:-translate-y-0.5',
                          task.done ? 'opacity-55' : ''
                        )}
                      >
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-medium', task.done ? 'text-muted line-through' : 'text-[color:var(--text)]')}>
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            Due {format(parseISO(task.dueDate as string), 'MMM d')}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted">
                    No upcoming tasks.
                  </div>
                )}
              </div>
            </div>
          </div>
    </div>
  );
}
