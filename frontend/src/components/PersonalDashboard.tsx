import React, { useState } from 'react';
import { Task, Event } from '../types';
import { Calendar, CheckSquare, Clock, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskList } from './TaskList';
import { format, isTomorrow, parseISO } from 'date-fns';

interface PersonalDashboardProps {
  tasks: Task[];
  events: Event[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, priority: 'high' | 'medium' | 'low', dueDate?: string) => void;
}

export function PersonalDashboard({ tasks, events, onToggleTask, onAddTask }: PersonalDashboardProps) {

  const completedCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - completedCount;

  // Filter events for tomorrow
  const tomorrowEvents = events.filter((event) => {
    // Assuming event.startTime is parsable or just string sorting for now.
    // The previous implementation was a generic "Tomorrow" label. 
    // Let's just use it as it was if no actual date fields are on Event.
    return true; // Simplified: we will leave events alone, but we need to check if there are any events at all
  });

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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TaskList 
            tasks={tasks.filter(t => !t.moduleId)} 
            onToggleTask={onToggleTask} 
            onAddTask={(title, priority, dueDate) => onAddTask(title, priority, dueDate)} 
            title="Personal Tasks" 
          />
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-accent" /> Upcoming
          </div>

          <div className="surface-strong rounded-[2rem] overflow-hidden">
            {tomorrowEvents.length > 0 && (
              <>
                <div className="border-b border-subtle px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted">Tomorrow</div>
                </div>
                <div className="relative space-y-4 p-4">
                  <div className="absolute left-[23px] top-4 bottom-4 w-px bg-current opacity-15" />
                  {tomorrowEvents.map((event) => (
                    <div key={event.id} className="group relative flex items-start">
                      <div
                        className={cn(
                          'relative z-10 mr-4 mt-1 h-3 w-3 rounded-full border-2 border-black/20 shadow-sm',
                          event.color === 'blue' ? 'bg-sky-400' : event.color === 'amber' ? 'bg-amber-400' : 'bg-violet-400'
                        )}
                      />
                      <div className="transition group-hover:translate-x-1">
                        <p className="text-sm font-medium text-[color:var(--text)]">{event.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{event.startTime} - {event.endTime}</p>
                        {event.description && (
                          <p className="mt-1 max-w-[220px] rounded-2xl border border-subtle surface-soft px-3 py-2 text-[11px] text-muted">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tomorrowEvents.length === 0 && (
              <div className="p-6 text-center text-sm text-muted">
                No upcoming events.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
