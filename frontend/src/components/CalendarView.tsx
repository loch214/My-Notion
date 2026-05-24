import React, { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  compareAsc,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trash2, Edit3, X, Plus } from 'lucide-react';
import { Event } from '../types';
import { cn } from '../lib/utils';

// Import UI primitives
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Modal } from './ui/Modal';
import { SectionHeader } from './ui/SectionHeader';

type ModalView =
  | { type: 'none' }
  | { type: 'day'; date: Date }
  | { type: 'details'; event: Event }
  | { type: 'form'; date: Date; event?: Event };

const colorClasses: Record<Event['color'], string> = {
  blue: 'bg-indigo-500 border-indigo-400',
  amber: 'bg-amber-500 border-amber-400',
  purple: 'bg-purple-500 border-purple-400',
};

function toInputTime(value?: string) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(11, 16);
  } catch {
    return '';
  }
}

function buildDateTime(date: Date, time: string) {
  const day = format(date, 'yyyy-MM-dd');
  return new Date(`${day}T${time}:00`).toISOString();
}

export default function CalendarView({
  events,
  onAddEvent,
  onRemoveEvent,
  onUpdateEvent,
}: {
  events: Event[];
  onAddEvent: (title: string, startTime: string, endTime: string, color: Event['color'], description?: string) => void;
  onRemoveEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<Event>) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modal, setModal] = useState<ModalView>({ type: 'none' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [] as Date[];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const eventsByDay = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const event of events) {
      try {
        const key = format(parseISO(event.startTime), 'yyyy-MM-dd');
        map[key] = map[key] || [];
        map[key].push(event);
      } catch {
        // ignore malformed dates
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        try {
          return compareAsc(parseISO(a.startTime), parseISO(b.startTime));
        } catch {
          return 0;
        }
      });
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    return events
      .filter((event) => {
        try {
          return isAfter(parseISO(event.startTime), new Date());
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return compareAsc(parseISO(a.startTime), parseISO(b.startTime));
        } catch {
          return 0;
        }
      })
      .slice(0, 8);
  }, [events]);

  const modalDate = modal.type === 'day' || modal.type === 'form' ? modal.date : null;
  const modalEvent = modal.type === 'details' || modal.type === 'form' ? modal.event : null;

  const openDay = (date: Date) => setModal({ type: 'day', date });
  const openDetails = (event: Event) => setModal({ type: 'details', event });
  const openCreate = (date: Date) => setModal({ type: 'form', date });
  const openEdit = (event: Event) => setModal({ type: 'form', date: new Date(event.startTime), event });
  const closeModal = () => setModal({ type: 'none' });

  return (
    <div className="animate-fade-up text-[color:var(--text)]">
      
      {/* 1. Header controls */}
      <SectionHeader
        title="Your academic schedule"
        subtitle="Manage lecture timings, assignment due dates, group study runs, and calendar events."
        category="Schedule"
        actions={
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1 rounded-2xl bg-[color:var(--surface-low)] border border-[color:var(--border)] p-1 shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentMonth((value) => subMonths(value, 1))} 
                className="h-8 w-8 rounded-xl p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold px-2.5 min-w-[90px] text-center font-heading">
                {format(monthStart, 'MMM yyyy')}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentMonth((value) => addMonths(value, 1))} 
                className="h-8 w-8 rounded-xl p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreate(new Date())}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add event
            </Button>
          </div>
        }
      />

      {/* 2. Responsive Layout Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] items-start">
        
        {/* Left Column: Interactive Calendar grid */}
        <Card spotlight={false} className="p-4 bg-[color:var(--surface-low)] border border-[color:var(--border)] overflow-hidden">
          
          {/* Weekday indicators */}
          <div className="grid grid-cols-7 gap-1 pb-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)] text-center border-b border-[color:var(--border)] mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Month cells grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const key = format(date, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[key] || [];
              const isCurrentMonth = isSameMonth(date, monthStart);
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDay(date)}
                  className={cn(
                    'min-h-[85px] max-h-[120px] rounded-xl border p-2 text-left transition-all flex flex-col justify-between hover:bg-[color:var(--surface-high)]/35 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15',
                    isCurrentMonth ? 'bg-[color:var(--surface-med)]/30 border-[color:var(--border)]' : 'bg-transparent border-transparent opacity-30 pointer-events-none',
                    isToday ? 'border-[color:var(--accent)]/45 bg-[color:var(--accent)]/5' : ''
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn('text-xs font-bold font-mono', isToday ? 'text-[color:var(--accent)]' : 'text-[color:var(--text)]')}>
                      {format(date, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span key={event.id} className={cn('h-1.5 w-1.5 rounded-full', colorClasses[event.color])} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Micro list of events inside calendar grid cell */}
                  <div className="mt-1.5 space-y-1 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openDetails(event);
                        }}
                        className="w-full rounded-md bg-[color:var(--surface-high)]/60 px-1.5 py-0.5 text-[9px] text-[color:var(--text)] truncate font-medium hover:bg-[color:var(--surface-high)] border border-[color:var(--border)] transition-colors cursor-pointer"
                      >
                        {format(parseISO(event.startTime), 'HH:mm')} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-[color:var(--muted)] pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right Column: Upcoming Agenda sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold font-heading text-[color:var(--text)] pl-1 shrink-0">
            <CalendarIcon className="h-4.5 w-4.5 text-[color:var(--accent)]" /> 
            Upcoming Schedule
          </div>
          <Card spotlight={false} className="p-4 bg-[color:var(--surface-low)]">
            <div className="space-y-2">
              {upcoming.length > 0 ? (
                upcoming.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openDetails(event)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl bg-[color:var(--surface-med)] border border-[color:var(--border)] px-3.5 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--border-focus)]/35"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-[color:var(--text)]">{event.title}</div>
                      <div className="text-[10px] text-[color:var(--muted)] mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(event.startTime), 'MMM d')} · {format(parseISO(event.startTime), 'HH:mm')}
                      </div>
                    </div>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', colorClasses[event.color])} />
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[color:var(--muted)]">
                  No upcoming calendar events.
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* 3. Portal Modal: Day schedule detail */}
      <Modal
        isOpen={modal.type === 'day'}
        onClose={closeModal}
        title={modalDate ? `Events on ${format(modalDate, 'MMM d, yyyy')}` : 'Day Events'}
        subtitle="Agenda overview"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-3">
          {modalDate && (eventsByDay[format(modalDate, 'yyyy-MM-dd')] || []).length > 0 ? (
            eventsByDay[format(modalDate, 'yyyy-MM-dd')].map((event) => (
              <div
                key={event.id}
                onClick={() => openDetails(event)}
                className="w-full flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface-low)] border border-[color:var(--border)] px-4 py-3 text-left transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-xs text-[color:var(--text)]">{event.title}</div>
                  <div className="text-[10px] text-[color:var(--muted)] mt-0.5">
                    {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('h-2 w-2 rounded-full', colorClasses[event.color])} />
                  <span className="text-[10px] font-semibold text-[color:var(--accent)] uppercase tracking-wider">Details</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-[color:var(--muted)] rounded-xl border border-dashed border-[color:var(--border)]">
              No calendar events scheduled on this day.
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-[color:var(--border)]">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => modalDate && openCreate(modalDate)}
              className="flex-1"
            >
              Add Event
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Portal Modal: Event details popup */}
      <Modal
        isOpen={modal.type === 'details'}
        onClose={closeModal}
        title={modalEvent ? modalEvent.title : 'Event details'}
        subtitle="Schedule info"
        maxWidthClassName="max-w-md"
      >
        {modalEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', colorClasses[modalEvent.color])} />
              <div className="text-xs text-[color:var(--text)] font-semibold font-mono">
                {format(parseISO(modalEvent.startTime), 'MMM d, yyyy')} · {format(parseISO(modalEvent.startTime), 'HH:mm')} - {format(parseISO(modalEvent.endTime), 'HH:mm')}
              </div>
            </div>

            {modalEvent.description && (
              <div className="rounded-2xl bg-[color:var(--surface-low)] border border-[color:var(--border)] p-4 text-xs leading-relaxed text-[color:var(--muted)]">
                {modalEvent.description}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-[color:var(--border)]">
              <Button
                variant="primary"
                onClick={() => modalEvent && openEdit(modalEvent)}
                leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                className="flex-1 text-xs"
              >
                Edit Event
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (modalEvent) onRemoveEvent(modalEvent.id);
                  closeModal();
                }}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                className="flex-1 text-xs"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. Portal Modal: Create/Edit Event Form */}
      <Modal
        isOpen={modal.type === 'form'}
        onClose={closeModal}
        title={modalEvent ? 'Edit schedule event' : 'Add new event'}
        subtitle={modalDate ? format(modalDate, 'MMM d, yyyy') : 'Schedule builder'}
        maxWidthClassName="max-w-sm"
      >
        {modalDate && (
          <EventForm
            date={modalDate}
            initial={modalEvent || undefined}
            onCancel={closeModal}
            onSave={(title, startTime, endTime, color, description, eventId) => {
              if (eventId) {
                onUpdateEvent(eventId, { title, startTime, endTime, color, description });
              } else {
                onAddEvent(title, startTime, endTime, color, description);
              }
              closeModal();
            }}
          />
        )}
      </Modal>

    </div>
  );
}

function EventForm({
  date,
  onCancel,
  onSave,
  initial,
}: {
  date: Date;
  onCancel: () => void;
  onSave: (title: string, start: string, end: string, color: Event['color'], description?: string, id?: string) => void;
  initial?: Event;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [startTime, setStartTime] = useState(toInputTime(initial?.startTime) || '09:00');
  const [endTime, setEndTime] = useState(toInputTime(initial?.endTime) || '10:00');
  const [color, setColor] = useState<Event['color']>(initial?.color ?? 'blue');
  const [description, setDescription] = useState(initial?.description ?? '');

  const save = () => {
    const start = buildDateTime(date, startTime);
    const end = buildDateTime(date, endTime);
    onSave(title.trim(), start, end, color, description.trim() || undefined, initial?.id);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">Event Title</label>
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="e.g. AI Lecture Review" 
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">Start</label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">End</label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">Color Tag</label>
        <div className="flex gap-2.5">
          {(['blue', 'amber', 'purple'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              className={cn(
                'h-9 w-9 rounded-full border border-white/10 transition-all ring-offset-2 ring-offset-[color:var(--app-bg)]',
                item === 'blue' ? 'bg-indigo-500' : item === 'amber' ? 'bg-amber-500' : 'bg-purple-500',
                color === item ? 'ring-2 ring-[color:var(--accent)] scale-105' : 'hover:scale-102 opacity-80'
              )}
              aria-label={`Set tag color ${item}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">Description Notes</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional outline or slides chapters..."
        />
      </div>

      <div className="flex gap-2 pt-4 border-t border-[color:var(--border)]">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button variant="primary" onClick={save} className="flex-1">
          {initial ? 'Save' : 'Save Event'}
        </Button>
      </div>
    </div>
  );
}
