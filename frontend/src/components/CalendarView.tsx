import React, { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, compareAsc } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types';
import { cn } from '../lib/utils';

export default function CalendarView({ events, onAddEvent, onRemoveEvent }: { events: Event[]; onAddEvent: (title: string, startTime: string, endTime: string, color: Event['color'], description?: string) => void; onRemoveEvent: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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
    for (const e of events) {
      try {
        const d = format(parseISO(e.startTime), 'yyyy-MM-dd');
        map[d] = map[d] || [];
        map[d].push(e);
      } catch (err) {
        // ignore
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => compareAsc(parseISO(a.startTime), parseISO(b.startTime)));
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    return events
      .filter(e => isAfter(parseISO(e.startTime), new Date()))
      .sort((a, b) => compareAsc(parseISO(a.startTime), parseISO(b.startTime)))
      .slice(0, 8);
  }, [events]);

  function openAdd(date: Date) {
    setSelectedDate(date);
    setIsAddOpen(true);
  }

  function openDetails(ev: Event) {
    setSelectedEvent(ev);
    setIsDetailsOpen(true);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost rounded-full p-2"><ChevronLeft className="h-4 w-4"/></button>
            <h3 className="text-lg font-semibold">{format(monthStart, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost rounded-full p-2"><ChevronRight className="h-4 w-4"/></button>
          </div>
        </div>

        <div className="surface rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-2 text-xs text-muted mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="text-center">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, idx) => {
              const key = format(d, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[key] || [];
              return (
                <div key={idx} className={cn('rounded-2xl p-2 h-28 flex flex-col justify-between cursor-pointer', isSameMonth(d, monthStart) ? 'bg-transparent' : 'opacity-40')} onClick={() => { if (dayEvents.length) { setSelectedDate(d); setIsDetailsOpen(true); } else { openAdd(d); } }}>
                  <div className="flex items-start justify-between">
                    <div className={cn('text-sm font-medium', isSameDay(d, new Date()) ? 'text-accent' : '')}>{format(d, 'd')}</div>
                    {dayEvents.length > 0 && <div className="flex gap-1">{dayEvents.slice(0,3).map((e,i) => <span key={i} className={cn('h-2 w-2 rounded-full', e.color === 'blue' ? 'bg-blue-500' : e.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500')}></span>)}</div>}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0,2).map(ev => (
                      <button key={ev.id} onClick={(evn) => { evn.stopPropagation(); openDetails(ev); }} className="w-full text-left text-xs rounded-md px-2 py-1 surface-soft">{format(parseISO(ev.startTime), 'HH:mm')} {ev.title}</button>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[11px] text-muted">+{dayEvents.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Upcoming events</h4>
        </div>
        <div className="surface rounded-2xl p-3 space-y-2">
          {upcoming.length > 0 ? upcoming.map(ev => (
            <div key={ev.id} className="flex items-center justify-between gap-3 rounded-md surface-soft px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{ev.title}</div>
                <div className="text-xs text-muted">{format(parseISO(ev.startTime), 'MMM d')} • {format(parseISO(ev.startTime), 'HH:mm')}</div>
              </div>
              <div className={cn('h-8 w-8 rounded-full', ev.color === 'blue' ? 'bg-blue-500' : ev.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500')}></div>
            </div>
          )) : <div className="p-4 text-sm text-muted">No upcoming events.</div>}
        </div>
      </aside>

      {/* Add Event Modal */}
      {isAddOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddOpen(false)} />
          <div className="surface rounded-2xl z-50 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Add Event — {format(selectedDate, 'MMM d, yyyy')}</h3>
            <EventForm date={selectedDate} onCancel={() => setIsAddOpen(false)} onSave={(title, start, end, color, desc) => { onAddEvent(title, start, end, color, desc); setIsAddOpen(false); }} />
          </div>
        </div>
      )}

      {/* Day details / add list modal */}
      {selectedDate && !isAddOpen && !isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDate(null)} />
          <div className="surface rounded-2xl z-50 w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold">Events — {format(selectedDate, 'MMM d, yyyy')}</h3>
            <div className="mt-4 space-y-2">
              {(eventsByDay[format(selectedDate,'yyyy-MM-dd')] || []).map(ev => (
                <div key={ev.id} className="surface-soft rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-muted">{format(parseISO(ev.startTime),'HH:mm')} - {format(parseISO(ev.endTime),'HH:mm')}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDetails(ev)} className="btn-ghost">Details</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setIsAddOpen(true); }} className="btn-primary">Add event</button>
              <button onClick={() => setSelectedDate(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {isDetailsOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsDetailsOpen(false)} />
          <div className="surface rounded-2xl z-50 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            <div className="mt-2 text-sm text-muted">{format(parseISO(selectedEvent.startTime),'MMM d, yyyy')}</div>
            <div className="mt-2 text-sm">{format(parseISO(selectedEvent.startTime),'HH:mm')} - {format(parseISO(selectedEvent.endTime),'HH:mm')}</div>
            {selectedEvent.description && <div className="mt-4 text-sm text-muted">{selectedEvent.description}</div>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { onRemoveEvent(selectedEvent.id); setIsDetailsOpen(false); }} className="btn-danger">Delete</button>
              <button onClick={() => setIsDetailsOpen(false)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventForm({ date, onCancel, onSave }: { date: Date; onCancel: () => void; onSave: (title: string, start: string, end: string, color: Event['color'], description?: string) => void }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState<Event['color']>('blue');
  const [description, setDescription] = useState('');

  const save = () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const start = new Date(`${dateStr}T${startTime}:00`).toISOString();
    const end = new Date(`${dateStr}T${endTime}:00`).toISOString();
    onSave(title, start, end, color, description);
  };

  return (
    <div className="space-y-3 mt-4">
      <label className="block text-sm">Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} className="w-full surface-soft rounded-md px-3 py-2" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm">Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full surface-soft rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full surface-soft rounded-md px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm">Color</label>
        <div className="mt-2 flex gap-2">
          <button onClick={() => setColor('blue')} className={cn('h-8 w-8 rounded-full', color === 'blue' ? 'ring-2 ring-offset-2 ring-accent' : '')} style={{ backgroundColor: '#3b82f6' }} />
          <button onClick={() => setColor('amber')} className={cn('h-8 w-8 rounded-full', color === 'amber' ? 'ring-2 ring-offset-2 ring-accent' : '')} style={{ backgroundColor: '#f59e0b' }} />
          <button onClick={() => setColor('purple')} className={cn('h-8 w-8 rounded-full', color === 'purple' ? 'ring-2 ring-offset-2 ring-accent' : '')} style={{ backgroundColor: '#8b5cf6' }} />
        </div>
      </div>

      <div>
        <label className="block text-sm">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full surface-soft rounded-md px-3 py-2" />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={save} className="btn-primary">Save</button>
      </div>
    </div>
  );
}
