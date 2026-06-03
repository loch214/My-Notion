import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Task } from '../types';
import { CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Plus, CalendarIcon, Edit3, Trash2 } from 'lucide-react';
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
  onAddTask: (title: string, dueDate?: string) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask?: (taskId: string) => void;
  showAddControls?: boolean;
  showTaskGroups?: boolean;
  title?: string;
  icon?: React.ElementType;
}

export function TaskList({ tasks, onToggleTask, onAddTask, onEditTask, onRemoveTask, showAddControls = true, showTaskGroups = true, title = "Tasks", icon: Icon = CheckSquare }: TaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDueDate, setEditingDueDate] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
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

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle, newTaskDueDate || undefined);
    setNewTaskTitle('');
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
            <div
              key={task.id}
              className={cn('surface-soft flex w-full items-start gap-3 rounded-3xl px-4 py-3 text-left transition-all duration-150 ease hover:-translate-y-0.5 sm:items-center', task.done ? 'opacity-55' : '')}
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggleTask(task.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-subtle text-accent focus:ring-[color:var(--accent)]/40 sm:mt-0"
              />
              <div className="min-w-0 flex-1">
                {editingId === task.id ? (
                  <div>
                    <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="surface-soft w-full rounded-2xl px-3 py-2 text-sm" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input type="date" value={editingDueDate} onChange={(e) => setEditingDueDate(e.target.value)} className="surface-soft min-w-[150px] rounded-2xl px-3 py-1 text-sm" />
                    </div>
                  </div>
                ) : (
                  <p className={cn('truncate text-sm font-medium', task.done ? 'text-muted line-through' : 'text-[color:var(--text)]')}>
                    {task.title}
                  </p>
                )}
              </div>
              {task.dueDate && editingId !== task.id && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-subtle surface-soft px-3 py-1.5 text-xs text-muted ml-2">
                  <CalendarIcon className="h-3.5 w-3.5" /> {format(parseISO(task.dueDate), 'MMM d')}
                </div>
              )}
              <div className="ml-auto flex shrink-0 gap-2 self-start sm:self-center">
                {editingId === task.id ? (
                  <>
                    <button onClick={async () => { if (editingTitle.trim()) { await (onEditTask?.(task.id, { title: editingTitle, dueDate: editingDueDate || undefined }) ); setEditingId(null); } }} className="btn-primary">Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(task.id); setEditingTitle(task.title); setEditingDueDate(task.dueDate || ''); }} className="surface-soft icon-btn text-muted hover:bg-[color:var(--surface-strong)]">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onRemoveTask?.(task.id)} className="surface-soft icon-btn text-muted hover:bg-[color:var(--surface-strong)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
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
        {showAddControls && !isAddingTask && (
          <button
            onClick={() => setIsAddingTask(true)}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </div>

      <div className="space-y-2">
        {showTaskGroups && renderGroup("Today & Overdue", today)}
        {showTaskGroups && renderGroup("Tomorrow", tomorrow)}
        {showTaskGroups && renderGroup("Upcoming", upcoming)}
        {showTaskGroups && renderGroup("No Date", noDate)}

        {showAddControls && isAddingTask ? (
          <form ref={dateRef} onSubmit={handleAddTask} className="surface rounded-3xl p-4 mt-2">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="surface-soft mb-3 w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all duration-150 ease focus:ring-2 focus:ring-[color:var(--accent)]/40 text-[color:var(--text)]"
            />
            {isDateOpen && (
              <div className="mb-3 w-full sm:w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[color:var(--border)] surface-soft p-2.5 shadow-lg">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => subMonths(month, 1))}
                          className="surface-soft rounded-full p-1.5 text-muted transition-all duration-150 ease hover:text-[color:var(--text)]"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="text-sm font-semibold text-[color:var(--text)]">
                          {format(calendarMonth, 'MMMM yyyy')}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => addMonths(month, 1))}
                          className="surface-soft rounded-full p-1.5 text-muted transition-all duration-150 ease hover:text-[color:var(--text)]"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} className="py-1">{day}</div>
                        ))}
                      </div>

                      <div className="mt-1.5 grid grid-cols-7 gap-0.5">
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
                                'flex h-8 items-center justify-center rounded-lg text-xs transition-all duration-150 ease',
                                isCurrentMonth ? 'text-[color:var(--text)]' : 'text-muted',
                                isSelected ? 'bg-accent text-[color:var(--on-accent)] font-medium' : 'hover:bg-[color:var(--surface-soft)]',
                                isTodayDate && !isSelected ? 'ring-1 ring-[color:var(--accent)]/35' : ''
                              )}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskDueDate('');
                            setIsDateOpen(false);
                          }}
                          className="btn-secondary"
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
                          className="btn-secondary"
                        >
                          Today
                        </button>
                      </div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDateOpen((open) => !open)}
                    className="surface-soft flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition-all duration-150 ease hover:text-[color:var(--text)]"
                  >
                    <CalendarIcon className="h-4 w-4 text-muted" />
                    {selectedDueDate ? format(selectedDueDate, 'MMM d, yyyy') : 'No due date'}
                    <ChevronDown className="h-4 w-4 text-muted" />
                  </button>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAddingTask(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save task
                </button>
              </div>
            </div>
          </form>
        ) : tasks.length === 0 ? (
          <div className="surface-soft rounded-3xl border border-subtle px-4 py-6 text-center">
            <p className="text-sm font-medium text-[color:var(--text)]">No tasks yet.</p>
            <p className="mt-1 text-sm text-muted">Add one task to start building momentum.</p>
            {showAddControls && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="btn-primary mt-4"
              >
                <Plus className="h-4 w-4" /> Create first task
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}