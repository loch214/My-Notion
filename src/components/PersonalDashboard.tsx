import React, { useState } from 'react';
import { Task, Event } from '../types';
import { Calendar, CheckSquare, Clock, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2 text-slate-900">Personal Dashboard</h1>
        <p className="text-slate-500">Organize your tasks, schedule, and non-academic notes.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Column */}
        <div className="col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
              <CheckSquare className="w-5 h-5 mr-2 text-indigo-500" /> Today's Tasks
            </h2>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className={cn(
                  "flex items-center p-3.5 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                  t.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'
                )} onClick={() => onToggleTask(t.id)}>
                    <input 
                      type="checkbox" 
                      checked={t.done} 
                      readOnly
                      className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 mr-4 shrink-0 transition-colors cursor-pointer" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", t.done ? 'line-through text-slate-400' : 'text-slate-700 font-medium')}>{t.title}</p>
                    </div>
                    {t.priority === 'high' && !t.done && <span className="w-2 h-2 rounded-full bg-red-400 mx-3 shadow-sm"></span>}
                    <div className="flex items-center text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      <Clock className="w-3.5 h-3.5 mr-1" /> {t.time}
                    </div>
                </div>
              ))}
              {isAddingTask ? (
                <form onSubmit={handleAddTask} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col gap-3">
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="text-xs font-medium border border-slate-200 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-600 bg-white"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors">Cancel</button>
                       <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors shadow-sm">Save Task</button>
                    </div>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="w-full text-left p-3.5 text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-dashed border-slate-300 transition-colors flex items-center justify-center font-medium"
                >
                  <Plus className="mr-2 w-4 h-4" /> Add new task
                </button>
              )}
            </div>
        </div>

        {/* Schedule / Upcoming */}
        <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
              <Calendar className="w-5 h-5 mr-2 text-indigo-500" /> Upcoming
            </h2>
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tomorrow</div>
              </div>
              <div className="p-4 space-y-4 relative">
                  <div className="absolute left-[23px] top-4 bottom-4 w-px bg-slate-100"></div>
                  {events.map((ev, i) => (
                    <div key={ev.id} className="flex relative items-start group">
                      <div className={cn("w-3 h-3 rounded-full mt-1 mr-4 relative z-10 border-2 border-white shadow-sm ring-1", 
                        ev.color === 'blue' ? 'bg-blue-500 ring-blue-100' : 
                        ev.color === 'amber' ? 'bg-amber-500 ring-amber-100' : 'bg-purple-500 ring-purple-100'
                      )}></div>
                      <div className="group-hover:translate-x-1 transition-transform">
                        <p className="text-sm font-medium text-slate-800">{ev.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ev.startTime} - {ev.endTime}</p>
                        {ev.description && (
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] bg-slate-50 border border-slate-100 px-2 py-1 rounded line-clamp-2">
                            {ev.description}
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
