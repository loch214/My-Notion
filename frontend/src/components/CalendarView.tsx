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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types';
import { cn } from '../lib/utils';

type ModalView =
  | { type: 'none' }
  | { type: 'day'; date: Date }
  | { type: 'details'; event: Event }
  | { type: 'form'; date: Date; event?: Event };

const colorClasses: Record<Event['color'], string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
};

function toInputTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
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
      map[key].sort((a, b) => compareAsc(parseISO(a.startTime), parseISO(b.startTime)));
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    return events
      .filter((event) => isAfter(parseISO(event.startTime), new Date()))
      .sort((a, b) => compareAsc(parseISO(a.startTime), parseISO(b.startTime)))
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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth((value) => subMonths(value, 1))} className="btn-ghost rounded-full p-2" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold sm:text-xl">{format(monthStart, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth((value) => addMonths(value, 1))} className="btn-ghost rounded-full p-2" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => openCreate(new Date())} className="btn-primary px-4 py-2 text-sm font-semibold">
            Add event
          </button>
        </div>

        <div className="surface rounded-2xl p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted sm:gap-2 sm:text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
                    'min-h-[7rem] rounded-2xl border border-transparent p-2 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/30 hover:bg-[color:var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 sm:min-h-[8rem]',
                    isCurrentMonth ? 'bg-transparent' : 'opacity-35',
                    isToday ? 'ring-1 ring-[color:var(--accent)]/30' : ''
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('text-sm font-medium sm:text-base', isToday ? 'text-accent' : 'text-[color:var(--text)]')}>
                      {format(date, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span key={event.id} className={cn('h-2 w-2 rounded-full', colorClasses[event.color])} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openDetails(event);
                        }}
                        className={cn(
                          'w-full rounded-xl px-2.5 py-1.5 text-left text-xs text-[color:var(--text)] transition hover:brightness-110 sm:text-[13px]',
                          'surface-soft'
                        )}
                      >
                        <div className="truncate font-medium">
                          {format(parseISO(event.startTime), 'HH:mm')} {event.title}
                        </div>
                      </button>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[11px] text-muted">+{dayEvents.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold sm:text-base">Upcoming events</h4>
        </div>
        <div className="surface rounded-2xl p-3 sm:p-4">
          <div className="space-y-2.5">
            {upcoming.length > 0 ? (
              upcoming.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openDetails(event)}
                  className="surface-soft flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[color:var(--text)]">{event.title}</div>
                    <div className="text-xs text-muted">
                      {format(parseISO(event.startTime), 'MMM d')} • {format(parseISO(event.startTime), 'HH:mm')}
                    </div>
                  </div>
                  <span className={cn('h-3 w-3 shrink-0 rounded-full', colorClasses[event.color])} />
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-muted">No upcoming events.</div>
            )}
          </div>
        </div>
      </aside>

      {modal.type === 'day' && modalDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button aria-label="Close day modal" className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="surface relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-subtle p-4 shadow-lg sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold sm:text-xl">Events — {format(modalDate, 'MMM d, yyyy')}</h3>
                <p className="mt-1 text-sm text-muted">Tap an event to view details or edit it.</p>
              </div>
              <button onClick={closeModal} className="btn-ghost rounded-full px-3 py-2 text-sm">
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {(eventsByDay[format(modalDate, 'yyyy-MM-dd')] || []).length > 0 ? (
                eventsByDay[format(modalDate, 'yyyy-MM-dd')].map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openDetails(event)}
                    className="surface-soft flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[color:var(--text)]">{event.title}</div>
                      <div className="text-xs text-muted">
                        {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('h-3 w-3 rounded-full', colorClasses[event.color])} />
                      <span className="text-sm text-accent">Details</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl surface-soft p-4 text-sm text-muted">No events on this day.</div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => openCreate(modalDate)} className="btn-primary px-4 py-2 text-sm font-semibold">
                Add event
              </button>
              <button onClick={closeModal} className="btn-ghost px-4 py-2 text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === 'details' && modalEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button aria-label="Close event details" className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="surface relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-subtle p-4 shadow-lg sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold sm:text-xl">{modalEvent.title}</h3>
                <p className="mt-2 text-sm text-muted">{format(parseISO(modalEvent.startTime), 'MMM d, yyyy')}</p>
                <p className="mt-1 text-base text-[color:var(--text)]">
                  {format(parseISO(modalEvent.startTime), 'HH:mm')} - {format(parseISO(modalEvent.endTime), 'HH:mm')}
                </p>
              </div>
              <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', colorClasses[modalEvent.color])} />
            </div>

            {modalEvent.description && <p className="mt-4 rounded-2xl surface-soft p-4 text-sm leading-6 text-muted">{modalEvent.description}</p>}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => openEdit(modalEvent)} className="btn-primary px-4 py-2 text-sm font-semibold">
                Edit
              </button>
              <button
                onClick={() => {
                  onRemoveEvent(modalEvent.id);
                  closeModal();
                }}
                className="btn-danger px-4 py-2 text-sm font-semibold"
              >
                Delete
              </button>
              <button onClick={closeModal} className="btn-ghost px-4 py-2 text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === 'form' && modalDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button aria-label="Close event form" className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="surface relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-subtle p-4 shadow-lg sm:p-6">
            <h3 className="text-lg font-semibold sm:text-xl">{modal.event ? 'Edit event' : `Add event — ${format(modalDate, 'MMM d, yyyy')}`}</h3>
            <EventForm
              date={modalDate}
              initial={modal.event}
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
          </div>
        </div>
      )}
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
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[color:var(--text)]">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-2xl surface-soft px-3 py-2.5 text-sm outline-none ring-0 placeholder:text-muted focus:ring-2 focus:ring-[color:var(--accent)]/30" placeholder="Event title" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[color:var(--text)]">Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2 w-full rounded-2xl surface-soft px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[color:var(--text)]">End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2 w-full rounded-2xl surface-soft px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[color:var(--text)]">Color</label>
        <div className="mt-2 flex gap-2">
          {(['blue', 'amber', 'purple'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              className={cn(
                'h-10 w-10 rounded-full border border-white/10 transition ring-offset-2 ring-offset-[color:var(--app-bg)]',
                item === 'blue' ? 'bg-blue-500' : item === 'amber' ? 'bg-amber-500' : 'bg-purple-500',
                color === item ? 'ring-2 ring-[color:var(--accent)]' : ''
              )}
              aria-label={`Set color ${item}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[color:var(--text)]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-2xl surface-soft px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
          placeholder="Optional notes"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm font-medium">
          Cancel
        </button>
        <button onClick={save} className="btn-primary px-4 py-2 text-sm font-semibold">
          {initial ? 'Save changes' : 'Save event'}
        </button>
      </div>
    </div>
  );
}
