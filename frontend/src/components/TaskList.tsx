import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Task } from '../types';
import { CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

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
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const priorityRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (priorityRef.current && !priorityRef.current.contains(target)) {
        setIsPriorityOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(target)) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (isDateOpen) {
      const baseDate = newTaskDueDate ? parseISO(newTaskDueDate) : new Date();
      setCalendarMonth(startOfMonth(baseDate));
    }
  }, [isDateOpen, newTaskDueDate]);

  const priorityOptions: Array<{ id: 'high' | 'medium' | 'low'; label: string }> = useMemo(() => ([
    { id: 'high', label: 'High priority' },
    { id: 'medium', label: 'Medium priority' },
    { id: 'low', label: 'Low priority' },
  ]), []);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

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

  const selectedDueDate = newTaskDueDate ? parseISO(newTaskDueDate) : null;

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
              <div className="flex flex-wrap gap-2">
                <div ref={priorityRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPriorityOpen((open) => !open)}
                    className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition hover:text-[color:var(--text)]"
                  >
                    {priorityOptions.find((option) => option.id === newTaskPriority)?.label}
                    <ChevronDown className="h-4 w-4 text-muted" />
                  </button>
                  {isPriorityOpen && (
                    <div className="absolute left-0 top-full z-20 mt-2 min-w-48 overflow-hidden rounded-2xl surface border border-subtle p-1.5 shadow-xl">
                      {priorityOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setNewTaskPriority(option.id);
                            setIsPriorityOpen(false);
                          }}
                          className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${newTaskPriority === option.id ? 'bg-accent text-white font-medium' : 'text-[color:var(--text)] hover:surface-soft'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={dateRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDateOpen((open) => !open)}
                    className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition hover:text-[color:var(--text)]"
                  >
                    <CalendarIcon className="h-4 w-4 text-muted" />
                    {selectedDueDate ? format(selectedDueDate, 'MMM d, yyyy') : 'No due date'}
                    <ChevronDown className="h-4 w-4 text-muted" />
                  </button>
                  {isDateOpen && (
                    <div className="absolute left-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-3xl surface border border-subtle p-4 shadow-xl">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => subMonths(month, 1))}
                          className="surface-soft rounded-full p-2 text-muted transition hover:text-[color:var(--text)]"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="text-sm font-semibold text-[color:var(--text)]">
                          {format(calendarMonth, 'MMMM yyyy')}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => addMonths(month, 1))}
                          className="surface-soft rounded-full p-2 text-muted transition hover:text-[color:var(--text)]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} className="py-1">{day}</div>
                        ))}
                      </div>

                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {calendarDays.map((day) => {
                          const isCurrentMonth = isSameMonth(day, calendarMonth);
                          const isSelected = selectedDueDate ? isSameDay(day, selectedDueDate) : false;
                          const isTodayDate = isToday(day);
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              onClick={() => {
                                setNewTaskDueDate(format(day, 'yyyy-MM-dd'));
                                setIsDateOpen(false);
                              }}
                              className={cn(
                                'flex h-10 items-center justify-center rounded-xl text-sm transition',
                                isCurrentMonth ? 'text-[color:var(--text)]' : 'text-muted/60',
                                isSelected ? 'bg-accent text-white font-medium' : 'hover:surface-soft',
                                isTodayDate && !isSelected ? 'ring-1 ring-[color:var(--accent)]/35' : ''
                              )}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskDueDate('');
                            setIsDateOpen(false);
                          }}
                          className="btn-secondary px-3 py-2 text-xs font-medium"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskDueDate(format(new Date(), 'yyyy-MM-dd'));
                            setCalendarMonth(startOfMonth(new Date()));
                            setIsDateOpen(false);
                          }}
                          className="btn-secondary px-3 py-2 text-xs font-medium"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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