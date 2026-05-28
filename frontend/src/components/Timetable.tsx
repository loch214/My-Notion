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
const TIME_RAIL_WIDTH = 38;
const DAY_MIN_WIDTH = 120;

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
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

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

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function hasTimetableConflict(entriesToCheck: TimetableEntry[], candidate: Draft, ignoreEntryId?: string) {
  const candidateStart = timeToMinutes(candidate.startTime);
  const candidateEnd = timeToMinutes(candidate.endTime);

  return entriesToCheck.some((entry) => {
    if (ignoreEntryId && entry.id === ignoreEntryId) return false;
    if (entry.dayOfWeek !== candidate.dayOfWeek) return false;

    return rangesOverlap(candidateStart, candidateEnd, timeToMinutes(entry.startTime), timeToMinutes(entry.endTime));
  });
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
      const height = clamp((endMinutes - startMinutes) * PIXELS_PER_MINUTE, 24, GRID_HEIGHT - top);

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

  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute overflow-hidden rounded-[6px] text-left transition hover:-translate-y-0.5 focus:outline-none"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: laneCount > 1 ? `${laneIndex * 50}%` : 0,
        right: laneCount > 1 ? 'auto' : 0,
        width: laneCount > 1 ? '50%' : '100%',
        minWidth: '55px',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" aria-hidden style={{ pointerEvents: 'none' }}>
        <div className={cn(kind.accent, 'h-full w-full rounded-r')} />
      </div>

      <div className="flex h-full min-w-0 flex-col gap-2 bg-[color:var(--surface-high)]/60 px-3 py-2 pl-4">
        <p className="min-w-0 break-words text-[14px] font-semibold leading-tight text-[color:var(--text)]">{module?.code ?? module?.title ?? 'Module'}</p>
        <div className={cn('inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[14px] font-medium leading-tight', kind.badge)}>
          <Icon className="h-3.5 w-3.5" />
          {kind.label}
        </div>
        <p className="text-[14px] font-medium leading-tight text-[color:var(--muted)] tabular-nums">
          {formatTimeLabel(entry.startTime)} - {formatTimeLabel(entry.endTime)}
        </p>
      </div>
    </button>
  );
}

function TimeAxis() {
  const labels = useMemo(() => {
    const values: Array<{ label: string; top: number }> = [];
    for (let hour = 8; hour <= 20; hour += 1) {
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
          className="absolute right-1.5 -translate-y-1/2 text-[12px] font-semibold tabular-nums text-[color:var(--text)]/90"
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
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 0));
  const todayDayOfWeek = new Date().getDay();

  useEffect(() => {
    if (!draft.moduleId && modules[0]?.id) {
      setDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
    if (!editDraft.moduleId && modules[0]?.id) {
      setEditDraft((current) => ({ ...current, moduleId: modules[0].id }));
    }
  }, [draft.moduleId, editDraft.moduleId, modules]);

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setViewportWidth(window.innerWidth);
      }, 120);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

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
  }, [entriesByDay, viewportWidth]);

  const handleAdd = () => {
    if (!draft.moduleId) return;
    if (hasTimetableConflict(entries, draft)) {
      window.alert('This session overlaps another session on the same day.');
      return;
    }
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
    if (hasTimetableConflict(entries, editDraft, editingEntry.id)) {
      window.alert('This update overlaps another session on the same day.');
      return;
    }
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

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-2 sm:p-3">
        <div className="flex w-full min-w-0 gap-2 overflow-visible pt-1">
          <div className="relative shrink-0 pr-1" style={{ width: `${TIME_RAIL_WIDTH}px`, height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT}px` }}>
            <div style={{ height: `${COLUMN_HEADER_HEIGHT}px` }} />
            <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
              <TimeAxis />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 overflow-visible rounded-2xl border border-[color:var(--border)]">
            {DAY_TABS.map((day) => {
              const positionedEntries = layoutsByDay[day.value] ?? [];

              return (
                <div
                  key={day.value}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col border-r border-[color:var(--border)]/20 last:border-r-0',
                    day.value === todayDayOfWeek && 'bg-[color:var(--accent)]/4'
                  )}
                  style={{ height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT}px` }}
                >
                  <div className={cn('flex h-[44px] items-center justify-between px-3 border-b border-[color:var(--border)]', day.value === todayDayOfWeek && 'border-b-[color:var(--accent)]/10') }>
                    <div className="min-w-0">
                      <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--muted)]', day.value === todayDayOfWeek ? 'text-[color:var(--accent)]' : '')}>
                        {day.label}
                      </p>
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
                      <div className="absolute inset-0 flex items-start justify-center px-3 pt-4 text-center text-xs text-[color:var(--muted)]">
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
