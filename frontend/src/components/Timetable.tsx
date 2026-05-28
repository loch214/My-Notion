import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Module, TimetableEntry } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Select } from './ui/Input';
import { cn } from '../lib/utils';
import { formatDayLabel } from '../lib/timetable';

interface TimetableProps {
  modules: Module[];
  entries: TimetableEntry[];
  onAddEntry: (entry: Omit<TimetableEntry, 'id'>) => TimetableEntry;
  onUpdateEntry: (id: string, updates: Partial<Omit<TimetableEntry, 'id'>>) => void;
  onRemoveEntry: (id: string) => void;
}

const DAY_TABS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
] as const;

const KIND_META = {
  lecture: { label: 'Lecture', accent: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)] border-[color:var(--accent)]/20' },
  lab: { label: 'Lab', accent: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  tutorial: { label: 'Tutorial', accent: 'bg-amber-500/15 text-amber-200 border-amber-500/20' },
} as const;

const TIME_START_HOUR = 7;
const TIME_END_HOUR = 22;
const TIME_STEP_MINUTES = 15;
const SLOT_HEIGHT = 56;
const TIMELINE_HEIGHT = (TIME_END_HOUR - TIME_START_HOUR) * SLOT_HEIGHT;
const HOURS = Array.from({ length: TIME_END_HOUR - TIME_START_HOUR + 1 }, (_, index) => TIME_START_HOUR + index);
const MINUTE_OPTIONS = ['00', '15', '30', '45'] as const;

const TIME_OPTIONS = Array.from({ length: ((TIME_END_HOUR - TIME_START_HOUR) * 60) / TIME_STEP_MINUTES + 1 }, (_, index) => {
  const totalMinutes = TIME_START_HOUR * 60 + index * TIME_STEP_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

type Kind = keyof typeof KIND_META;

type Draft = {
  moduleId: string;
  dayOfWeek: number;
  kind: Kind;
  startTime: string;
  endTime: string;
  reminderMinutes: number;
};

const DEFAULT_DRAFT: Draft = {
  moduleId: '',
  dayOfWeek: 1,
  kind: 'lecture',
  startTime: '08:30',
  endTime: '10:00',
  reminderMinutes: -1,
};

function formatTimeLabel(value: string) {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(':');
  return Number(hoursRaw) * 60 + Number(minutesRaw);
}

function minutesFromTimelineStart(value: string) {
  return timeToMinutes(value) - TIME_START_HOUR * 60;
}

function formatRailLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function splitTime(value: string) {
  const [hours = '07', minutes = '00'] = value.split(':');
  return {
    hour: String(Number(hours)).padStart(2, '0'),
    minute: String(Number(minutes)).padStart(2, '0'),
  };
}

function joinTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function sortByTime(left: TimetableEntry, right: TimetableEntry) {
  return left.startTime.localeCompare(right.startTime);
}

function createDraftFromEntry(entry: TimetableEntry): Draft {
  return {
    moduleId: entry.moduleId,
    dayOfWeek: entry.dayOfWeek,
    kind: entry.kind,
    startTime: entry.startTime,
    endTime: entry.endTime,
    reminderMinutes: entry.reminderMinutes,
  };
}

interface PositionedEntry {
  entry: TimetableEntry;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
}

function buildDayLayout(dayEntries: TimetableEntry[]): PositionedEntry[] {
  const sorted = [...dayEntries].sort(sortByTime);
  const clusters: TimetableEntry[][] = [];

  for (const entry of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster) {
      clusters.push([entry]);
      continue;
    }

    const clusterEnd = Math.max(...lastCluster.map((clusterEntry) => timeToMinutes(clusterEntry.endTime)));
    if (timeToMinutes(entry.startTime) < clusterEnd) {
      lastCluster.push(entry);
    } else {
      clusters.push([entry]);
    }
  }

  return clusters.flatMap((cluster) => {
    const lanes: TimetableEntry[][] = [];

    for (const entry of cluster) {
      const laneIndex = lanes.findIndex((lane) => lane.every((laneEntry) => timeToMinutes(entry.startTime) >= timeToMinutes(laneEntry.endTime) || timeToMinutes(entry.endTime) <= timeToMinutes(laneEntry.startTime)));
      if (laneIndex === -1) {
        lanes.push([entry]);
      } else {
        lanes[laneIndex].push(entry);
      }
    }

    const laneCount = Math.max(1, lanes.length);

    return cluster.map((entry) => {
      const laneIndex = lanes.findIndex((lane) => lane.includes(entry));
      return {
        entry,
        top: minutesFromTimelineStart(entry.startTime) / TIME_STEP_MINUTES * (SLOT_HEIGHT / 4),
        height: Math.max(48, (timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)) / TIME_STEP_MINUTES * (SLOT_HEIGHT / 4) - 6),
        laneIndex: laneIndex < 0 ? 0 : laneIndex,
        laneCount,
      };
    });
  });
}

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = splitTime(value);

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-[color:var(--muted)]">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <Select value={parts.hour} onChange={(event) => onChange(joinTime(event.target.value, parts.minute))}>
          {HOURS.map((hour) => {
            const valueText = String(hour).padStart(2, '0');
            return (
              <option key={valueText} value={valueText}>
                {valueText}
              </option>
            );
          })}
        </Select>
        <Select value={parts.minute} onChange={(event) => onChange(joinTime(parts.hour, event.target.value))}>
          {MINUTE_OPTIONS.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export default function Timetable({ modules, entries, onAddEntry, onUpdateEntry, onRemoveEntry }: TimetableProps) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '' }));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(DEFAULT_DRAFT);

  const selectedModule = modules.find((entry) => entry.id === draft.moduleId) ?? null;
  useEffect(() => {
    if (!draft.moduleId && modules[0]?.id) {
      setDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
    if (!editDraft.moduleId && modules[0]?.id) {
      setEditDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
  }, [draft.moduleId, editDraft.moduleId, modules]);

  const entriesByDay = useMemo(
    () =>
      DAY_TABS.reduce<Record<number, TimetableEntry[]>>((accumulator, day) => {
        accumulator[day.value] = entries.filter((entry) => entry.dayOfWeek === day.value).sort(sortByTime);
        return accumulator;
      }, {} as Record<number, TimetableEntry[]>),
    [entries]
  );

  const layoutsByDay = useMemo(
    () =>
      DAY_TABS.reduce<Record<number, PositionedEntry[]>>((accumulator, day) => {
        accumulator[day.value] = buildDayLayout(entriesByDay[day.value] ?? []);
        return accumulator;
      }, {} as Record<number, PositionedEntry[]>),
    [entriesByDay]
  );

  const handleAdd = () => {
    if (!draft.moduleId) return;
    onAddEntry(draft);
    setIsAddModalOpen(false);
    setDraft((current) => ({
      ...DEFAULT_DRAFT,
      moduleId: modules[0]?.id ?? current.moduleId,
    }));
  };

  const openAdd = (dayOfWeek: number) => {
    setDraft({
      ...DEFAULT_DRAFT,
      moduleId: modules[0]?.id ?? '',
      dayOfWeek,
    });
    setIsAddModalOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEditDraft(createDraftFromEntry(entry));
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    onUpdateEntry(editingEntry.id, editDraft);
    setEditingEntry(null);
  };

  const removeEdit = () => {
    if (!editingEntry) return;
    onRemoveEntry(editingEntry.id);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">Timetable</h1>
          <p className="max-w-2xl text-sm text-[color:var(--muted)]">
            Pick a module, choose lecture, lab, or tutorial, and add the weekly slot. Click a card to edit or delete it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-1.5">{modules.length} modules</span>
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-1.5">{entries.length} weekly slots</span>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[color:var(--surface-low)] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Weekly schedule</p>
            <h2 className="text-sm font-semibold text-[color:var(--text)]">Days and class slots</h2>
          </div>
          <p className="text-xs text-[color:var(--muted)]">Tap a card to edit</p>
        </div>

        <div className="overflow-hidden">
          <div className="grid w-full grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-1 xl:gap-1.5">
            <div>
              <div className="h-10" />
              <div className="relative mt-2 h-[840px] rounded-3xl bg-[color:var(--surface-med)]/35 p-1">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]"
                    style={{ top: `${(hour - TIME_START_HOUR) * SLOT_HEIGHT}px` }}
                  >
                    <span className="block pr-1 text-right">{formatRailLabel(hour)}</span>
                  </div>
                ))}
              </div>
            </div>

            {DAY_TABS.map((day) => {
              const positionedEntries = layoutsByDay[day.value] ?? [];
              return (
                <div key={day.value} className="flex min-w-0 flex-col rounded-3xl bg-[color:var(--surface-med)]/55 p-2">
                  <div className="pb-1">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">{day.label}</div>
                    <div className="mt-1 text-sm font-semibold text-[color:var(--text)]">{formatDayLabel(day.value)}</div>
                  </div>

                  <div className="relative mt-1 h-[840px] rounded-3xl border border-[color:var(--border)]/40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:100%_56px]">
                    {Array.from({ length: TIME_END_HOUR - TIME_START_HOUR }, (_, index) => index).map((index) => (
                      <div
                        key={index}
                        className="absolute inset-x-0 border-t border-[color:var(--border)]/35"
                        style={{ top: `${index * SLOT_HEIGHT}px` }}
                      />
                    ))}

                    {positionedEntries.length === 0 ? (
                      <div className="absolute inset-0 flex items-start justify-center px-3 pt-4 text-center text-xs text-[color:var(--muted)]">
                        No classes yet.
                      </div>
                    ) : null}

                    {positionedEntries.map(({ entry, top, height, laneIndex, laneCount }) => {
                      const module = modules.find((moduleEntry) => moduleEntry.id === entry.moduleId);
                      const kindMeta = KIND_META[entry.kind];
                      const laneWidth = 100 / laneCount;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="group absolute rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)] p-3 text-left shadow-[0_12px_24px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/25"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${laneIndex * laneWidth}% + 4px)`,
                            width: `calc(${laneWidth}% - 8px)`,
                          }}
                        >
                          <div className="flex h-full flex-col justify-between gap-2">
                            <div className="min-w-0">
                              <div className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]', kindMeta.accent)}>
                                {kindMeta.label}
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold text-[color:var(--text)]">{module ? module.code : 'Module'}</p>
                            </div>
                            <p className="whitespace-nowrap text-xs font-medium text-[color:var(--muted)]">
                              {formatTimeLabel(entry.startTime)} - {formatTimeLabel(entry.endTime)}
                            </p>
                          </div>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => openAdd(day.value)}
                      className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border)]/50 bg-[color:var(--surface-low)]/70 px-3 py-2.5 text-xs font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)]/35 hover:text-[color:var(--text)]"
                      aria-label={`Add slot for ${formatDayLabel(day.value)}`}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add timetable slot"
        subtitle="Pick a module and set the class details for this day"
        maxWidthClassName="max-w-lg"
      >
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
              value={draft.moduleId}
              onChange={(event) => setDraft((current) => ({ ...current, moduleId: event.target.value }))}
            >
              <option value="">Select a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.title}
                </option>
              ))}
            </select>
          </label>

          {selectedModule ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Selected module</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{selectedModule.code}</p>
              <p className="text-xs text-[color:var(--muted)]">{selectedModule.title}</p>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Class type</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as Kind }))}
            >
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="tutorial">Tutorial</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Start time" value={draft.startTime} onChange={(value) => setDraft((current) => ({ ...current, startTime: value }))} />
            <TimePicker label="End time" value={draft.endTime} onChange={(value) => setDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
              value={draft.reminderMinutes}
              onChange={(event) => setDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
            >
              <option value={-1}>Off</option>
              <option value={1440}>1 day before</option>
              <option value={60}>1 hour before</option>
              <option value={30}>30 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={0}>At class time</option>
            </select>
          </label>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleAdd} variant="secondary" className="flex-1">
              Add class slot
            </Button>
            <Button onClick={() => setIsAddModalOpen(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        title="Edit timetable slot"
        subtitle="Update or remove this class slot"
        maxWidthClassName="max-w-xl"
      >
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
              value={editDraft.moduleId}
              onChange={(event) => setEditDraft((current) => ({ ...current, moduleId: event.target.value }))}
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs text-[color:var(--muted)]">Day</span>
              <select
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
                value={editDraft.dayOfWeek}
                onChange={(event) => setEditDraft((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
              >
                {DAY_TABS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {formatDayLabel(day.value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-[color:var(--muted)]">Class type</span>
              <select
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
                value={editDraft.kind}
                onChange={(event) => setEditDraft((current) => ({ ...current, kind: event.target.value as Kind }))}
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Start time" value={editDraft.startTime} onChange={(value) => setEditDraft((current) => ({ ...current, startTime: value }))} />
            <TimePicker label="End time" value={editDraft.endTime} onChange={(value) => setEditDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]/40"
              value={editDraft.reminderMinutes}
              onChange={(event) => setEditDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
            >
              <option value={-1}>Off</option>
              <option value={1440}>1 day before</option>
              <option value={60}>1 hour before</option>
              <option value={30}>30 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={0}>At class time</option>
            </select>
          </label>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={saveEdit} className="flex-1">Save changes</Button>
            <Button variant="danger" onClick={removeEdit} leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
