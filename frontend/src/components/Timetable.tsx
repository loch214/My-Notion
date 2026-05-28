import { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker, GraduationCap, Plus, Trash2, Users } from 'lucide-react';
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

const GRID_START_MINUTES = 8 * 60 + 30;
const GRID_END_MINUTES = 20 * 60 + 30;
const PIXELS_PER_MINUTE = 1.1;
const GRID_HEIGHT = (GRID_END_MINUTES - GRID_START_MINUTES) * PIXELS_PER_MINUTE;
const COLUMN_HEADER_HEIGHT = 44;
const TIME_RAIL_WIDTH = 50;

const KIND_META = {
  lecture: {
    label: 'Lecture',
    badge: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)] border-[color:var(--accent)]/20',
    accent: 'bg-[color:var(--accent)]',
    icon: GraduationCap,
  },
  lab: {
    label: 'Lab',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    accent: 'bg-emerald-400',
    icon: Beaker,
  },
  tutorial: {
    label: 'Tutorial',
    badge: 'bg-amber-500/15 text-amber-200 border-amber-500/20',
    accent: 'bg-amber-400',
    icon: Users,
  },
} as const;

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

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, index) => String(8 + index).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function timeToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(':');
  return Number(hoursRaw || 0) * 60 + Number(minutesRaw || 0);
}

function minutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTimeLabel(value: string) {
  return value;
}

function splitTime(value: string) {
  const [hours = '08', minutes = '30'] = value.split(':');
  return {
    hour: String(Number(hours)).padStart(2, '0'),
    minute: String(Number(minutes)).padStart(2, '0'),
  };
}

function joinTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function getGridTop(timeValue: string) {
  return (timeToMinutes(timeValue) - GRID_START_MINUTES) * PIXELS_PER_MINUTE;
}

interface PositionedEntry {
  entry: TimetableEntry;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
}

function buildDayLayout(dayEntries: TimetableEntry[]): PositionedEntry[] {
  const sorted = [...dayEntries].sort((left, right) => {
    const startDifference = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    if (startDifference !== 0) return startDifference;
    return timeToMinutes(left.endTime) - timeToMinutes(right.endTime);
  });

  const clusters: TimetableEntry[][] = [];
  let currentCluster: TimetableEntry[] = [];
  let currentClusterEnd = -1;

  for (const entry of sorted) {
    const startMinutes = timeToMinutes(entry.startTime);
    const endMinutes = timeToMinutes(entry.endTime);

    if (currentCluster.length === 0 || startMinutes < currentClusterEnd) {
      currentCluster.push(entry);
      currentClusterEnd = Math.max(currentClusterEnd, endMinutes);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [entry];
    currentClusterEnd = endMinutes;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const laneEndTimes: number[] = [];
    const laneAssignments = new Map<string, number>();

    for (const entry of cluster) {
      const startMinutes = timeToMinutes(entry.startTime);
      const endMinutes = timeToMinutes(entry.endTime);
      let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= startMinutes);

      if (laneIndex === -1) {
        if (laneEndTimes.length < 2) {
          laneIndex = laneEndTimes.length;
          laneEndTimes.push(endMinutes);
        } else {
          laneIndex = laneEndTimes[0] <= laneEndTimes[1] ? 0 : 1;
          laneEndTimes[laneIndex] = endMinutes;
        }
      } else {
        laneEndTimes[laneIndex] = endMinutes;
      }

      laneAssignments.set(entry.id, laneIndex);
    }

    const laneCount = cluster.length > 1 ? 2 : 1;

    return cluster.map((entry) => {
      const startMinutes = timeToMinutes(entry.startTime);
      const endMinutes = timeToMinutes(entry.endTime);
      const top = clamp((startMinutes - GRID_START_MINUTES) * PIXELS_PER_MINUTE, 0, GRID_HEIGHT);
      const height = clamp((endMinutes - startMinutes) * PIXELS_PER_MINUTE, 10, GRID_HEIGHT - top);

      return {
        entry,
        top,
        height,
        laneIndex: laneAssignments.get(entry.id) ?? 0,
        laneCount,
      };
    });
  });
}

function ScrollWheel({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemHeight = 36;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = options.indexOf(value);
    if (index < 0) return;

    const targetTop = index * itemHeight;
    if (Math.abs(container.scrollTop - targetTop) <= 2) return;

    scrollLockRef.current = true;
    container.scrollTo({ top: targetTop, behavior: 'auto' });
    const timer = setTimeout(() => {
      scrollLockRef.current = false;
    }, 40);

    return () => clearTimeout(timer);
  }, [itemHeight, options, value]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (scrollLockRef.current) return;

    const container = event.currentTarget;
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
    }

    settleTimerRef.current = setTimeout(() => {
      const selectedIndex = Math.round(container.scrollTop / itemHeight);
      const selected = options[selectedIndex];
      if (selected && selected !== value) {
        onChange(selected);
      }
    }, 80);
  };

  return (
    <div className="relative h-[120px] w-[72px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-[42px] h-[36px] border-y border-[color:var(--accent)]/20 bg-[color:var(--accent)]/5" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[color:var(--surface-med)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[color:var(--surface-med)] to-transparent" />
      <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto py-[42px] no-scrollbar">
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                'flex h-[36px] w-full items-center justify-center text-sm tabular-nums transition-colors',
                isSelected ? 'font-bold text-[color:var(--accent)]' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeWheelPicker({
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
      <div className="flex items-center gap-2">
        <ScrollWheel options={HOUR_OPTIONS} value={parts.hour} onChange={(hour) => onChange(joinTime(hour, parts.minute))} />
        <span className="text-lg font-semibold text-[color:var(--muted)]">:</span>
        <ScrollWheel options={MINUTE_OPTIONS} value={parts.minute} onChange={(minute) => onChange(joinTime(parts.hour, minute))} />
      </div>
    </div>
  );
}

function TimeSlotCard({
  entry,
  module,
  top,
  height,
  laneIndex,
  laneCount,
  onClick,
}: {
  entry: TimetableEntry;
  module: Module | undefined;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
  onClick: () => void;
}) {
  const kind = KIND_META[entry.kind];
  const Icon = kind.icon;
  const compact = height < 45;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group absolute overflow-hidden rounded-[4px] border-y border-r border-l-[3px] border-y-[color:var(--border)] border-r-[color:var(--border)] text-left shadow-sm transition hover:-translate-y-0.5 focus:outline-none",
        entry.kind === 'lecture' && 'border-l-[color:var(--accent)]',
        entry.kind === 'lab' && 'border-l-emerald-400',
        entry.kind === 'tutorial' && 'border-l-amber-400'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: laneCount > 1 ? (laneIndex === 0 ? '0' : '50%') : '0',
        width: laneCount > 1 ? '50%' : '100%',
        backgroundColor: 'var(--surface-med)',
      }}
    >
      <div className="flex h-full min-w-0 flex-col gap-1 px-2 py-1.5">
        <p className="min-w-0 truncate text-[12px] font-bold leading-tight text-[color:var(--text)]" title={module?.title ?? 'Module'}>
          {module?.title ?? 'Module'}
        </p>
        {!compact ? (
          <>
            <div className={cn('inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none', kind.badge)}>
              <Icon className="h-3 w-3" />
              {kind.label}
            </div>
            <p className="mt-auto whitespace-nowrap text-[11px] font-medium text-[color:var(--muted)]">
              {formatTimeLabel(entry.startTime)} - {formatTimeLabel(entry.endTime)}
            </p>
          </>
        ) : null}
      </div>
    </button>
  );
}

function TimeAxis() {
  const labels = useMemo(() => {
    const values: Array<{ label: string; top: number }> = [];
    for (let hour = 9; hour <= 20; hour += 1) {
      const minutes = hour * 60;
      values.push({
        label: minutesToTime(minutes),
        top: (minutes - GRID_START_MINUTES) * PIXELS_PER_MINUTE,
      });
    }
    return values;
  }, []);

  return (
    <div className="relative h-full w-full">
      {labels.map((label) => (
        <div
          key={label.top}
          className="absolute right-1.5 -translate-y-1/2 text-[11px] text-[color:var(--muted)]"
          style={{ top: `${label.top}px` }}
        >
          {label.label}
        </div>
      ))}
    </div>
  );
}

export default function Timetable({ modules, entries, onAddEntry, onUpdateEntry, onRemoveEntry }: TimetableProps) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '' }));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(DEFAULT_DRAFT);

  useEffect(() => {
    if (!draft.moduleId && modules[0]?.id) {
      setDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
    if (!editDraft.moduleId && modules[0]?.id) {
      setEditDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
  }, [draft.moduleId, editDraft.moduleId, modules]);

  const entriesByDay = useMemo(() => {
    return DAY_TABS.reduce<Record<number, TimetableEntry[]>>((accumulator, day) => {
      accumulator[day.value] = entries
        .filter((entry) => entry.dayOfWeek === day.value)
        .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));
      return accumulator;
    }, {} as Record<number, TimetableEntry[]>);
  }, [entries]);

  const layoutsByDay = useMemo(() => {
    return DAY_TABS.reduce<Record<number, PositionedEntry[]>>((accumulator, day) => {
      accumulator[day.value] = buildDayLayout(entriesByDay[day.value] ?? []);
      return accumulator;
    }, {} as Record<number, PositionedEntry[]>);
  }, [entriesByDay]);

  const handleAdd = () => {
    if (!draft.moduleId) return;
    onAddEntry(draft);
    setIsAddModalOpen(false);
    setDraft({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '', reminderMinutes: -1 });
  };

  const openAdd = (dayOfWeek: number) => {
    setDraft({
      ...DEFAULT_DRAFT,
      moduleId: modules[0]?.id ?? '',
      dayOfWeek,
      reminderMinutes: -1,
    });
    setIsAddModalOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEditDraft({
      moduleId: entry.moduleId,
      dayOfWeek: entry.dayOfWeek,
      kind: entry.kind,
      startTime: entry.startTime,
      endTime: entry.endTime,
      reminderMinutes: entry.reminderMinutes,
    });
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

        <div className="overflow-hidden rounded-3xl border border-[color:var(--border)]/40 bg-[color:var(--surface-low)]">
          <div className="flex w-full min-w-0 overflow-hidden">
            <div className="relative shrink-0" style={{ width: `${TIME_RAIL_WIDTH}px`, height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT}px` }}>
              <div className="h-[44px]" />
              <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
                <TimeAxis />
              </div>
            </div>

            {DAY_TABS.map((day) => {
              const positionedEntries = layoutsByDay[day.value] ?? [];

              return (
                <div
                  key={day.value}
                  className="relative flex min-w-0 flex-1 flex-col border-r border-[color:var(--border)]/30 last:border-r-0"
                  style={{ height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT}px` }}
                >
                  <div className="flex h-[44px] items-center justify-between px-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">{day.label}</p>
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">{formatDayLabel(day.value)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdd(day.value)}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[color:var(--border)]/45 bg-transparent px-3 text-[11px] font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)]/35 hover:text-[color:var(--text)]"
                      aria-label={`Add slot for ${formatDayLabel(day.value)}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div
                    className="relative"
                    style={{
                      height: `${GRID_HEIGHT}px`,
                      background: 'transparent',
                    }}
                  >
                    {positionedEntries.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3 text-center text-xs text-[color:var(--muted)]">
                        No classes yet.
                      </div>
                    ) : null}

                    {positionedEntries.map(({ entry, top, height, laneIndex, laneCount }) => {
                      const module = modules.find((moduleEntry) => moduleEntry.id === entry.moduleId);

                      return (
                        <TimeSlotCard
                          key={entry.id}
                          entry={entry}
                          module={module}
                          top={top}
                          height={height}
                          laneIndex={laneIndex}
                          laneCount={laneCount}
                          onClick={() => openEdit(entry)}
                        />
                      );
                    })}
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
        subtitle={`Add a class for ${formatDayLabel(draft.dayOfWeek)}`}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <Select value={draft.moduleId} onChange={(event) => setDraft((current) => ({ ...current, moduleId: event.target.value }))}>
              <option value="">Select a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.title}
                </option>
              ))}
            </Select>
          </label>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Selected day</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{formatDayLabel(draft.dayOfWeek)}</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Class type</span>
            <Select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as Kind }))}>
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="tutorial">Tutorial</option>
            </Select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeWheelPicker label="Start time" value={draft.startTime} onChange={(value) => setDraft((current) => ({ ...current, startTime: value }))} />
            <TimeWheelPicker label="End time" value={draft.endTime} onChange={(value) => setDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <Select
              value={draft.reminderMinutes}
              onChange={(event) => setDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
            >
              <option value={-1}>Off</option>
              <option value={0}>At class time</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </Select>
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
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <Select value={editDraft.moduleId} onChange={(event) => setEditDraft((current) => ({ ...current, moduleId: event.target.value }))}>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.title}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Class type</span>
            <Select value={editDraft.kind} onChange={(event) => setEditDraft((current) => ({ ...current, kind: event.target.value as Kind }))}>
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="tutorial">Tutorial</option>
            </Select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeWheelPicker label="Start time" value={editDraft.startTime} onChange={(value) => setEditDraft((current) => ({ ...current, startTime: value }))} />
            <TimeWheelPicker label="End time" value={editDraft.endTime} onChange={(value) => setEditDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <Select
              value={editDraft.reminderMinutes}
              onChange={(event) => setEditDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
            >
              <option value={-1}>Off</option>
              <option value={0}>At class time</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </Select>
          </label>

          <div className="flex gap-2 pt-2">
            <Button onClick={saveEdit} variant="secondary" className="flex-1">
              Save changes
            </Button>
            <Button onClick={removeEdit} variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
