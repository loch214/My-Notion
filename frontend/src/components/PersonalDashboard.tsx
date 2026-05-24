import React, { useMemo } from 'react';
import { Task, Event } from '../types';
import { Calendar, CheckSquare, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskList } from './TaskList';
import { format, isAfter, isToday, parseISO, startOfDay } from 'date-fns';

// Import UI primitives
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SectionHeader } from './ui/SectionHeader';

interface PersonalDashboardProps {
  tasks: Task[];
  events: Event[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
}

export function PersonalDashboard({
  tasks,
  events,
  onToggleTask,
  onAddTask,
  onEditTask,
  onRemoveTask
}: PersonalDashboardProps) {

  const completedCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - completedCount;

  const upcomingTasks = useMemo(
    () => tasks
      .filter((task) => task.moduleId === undefined && task.dueDate && !task.done)
      .filter((task) => {
        try {
          const dueDate = parseISO(task.dueDate as string);
          return isToday(dueDate) || isAfter(dueDate, startOfDay(new Date()));
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return parseISO(a.dueDate as string).getTime() - parseISO(b.dueDate as string).getTime();
        } catch {
          return 0;
        }
      })
      .slice(0, 6),
    [tasks]
  );

  return (
    <div className="animate-fade-up text-[color:var(--text)]">
      
      {/* 1. Header */}
      <SectionHeader
        title="Tasks, events, and daily focus"
        subtitle="Manage your direct priorities, checklist todos, and daily agenda without leaving the unified workspace."
        category="Personal Space"
      />

      {/* 2. Responsive wrap cards grid */}
      <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[
          { label: 'Open tasks', value: openCount, icon: CheckSquare },
          { label: 'Completed tasks', value: completedCount, icon: CheckSquare },
          { label: 'Upcoming events', value: events.length, icon: Calendar },
        ].map((stat, index) => (
          <Card key={`${stat.label}-${index}`} spotlight={true} className="p-5 bg-[color:var(--surface-low)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)] font-semibold">{stat.label}</p>
              <stat.icon className="h-4.5 w-4.5 text-[color:var(--accent)]" />
            </div>
            <p className="mt-3 text-3xl font-bold font-heading text-[color:var(--text)]">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* 3. Splitted Page Columns */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] items-start">
        
        {/* Left Column: Personal Checklist */}
        <Card spotlight={false} className="p-5 bg-[color:var(--surface-low)]">
          <TaskList
            tasks={tasks.filter(t => !t.moduleId)}
            onToggleTask={onToggleTask}
            onAddTask={(title, dueDate) => onAddTask(title, dueDate)}
            onEditTask={onEditTask}
            onRemoveTask={onRemoveTask}
            title="Personal Todo List"
          />
        </Card>

        {/* Right Column: Upcoming Agenda */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2 text-base font-bold font-heading text-[color:var(--text)] pl-1">
            <Calendar className="h-4.5 w-4.5 text-[color:var(--accent)]" /> 
            Focus Agenda
          </div>
          <Card spotlight={false} className="p-5 bg-[color:var(--surface-low)]">
            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onToggleTask(task.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl bg-[color:var(--surface-med)] border border-[color:var(--border)] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--border-focus)]/30',
                      task.done ? 'opacity-55' : ''
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-semibold', task.done ? 'text-[color:var(--muted)] line-through' : 'text-[color:var(--text)]')}>
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted)] font-mono">
                        Due {format(parseISO(task.dueDate as string), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[color:var(--muted)]">
                No upcoming focus tasks due this week.
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
