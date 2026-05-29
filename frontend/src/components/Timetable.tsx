import { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker, ChevronLeft, ChevronRight, GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import { Module, TimetableEntry } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Dropdown, type DropdownOption } from './ui/Dropdown';
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
const GRID_TOP_GAP = 6;

const TIME_RAIL_WIDTH = 38;
const IS_DEV = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
const GUIDE_HIGHLIGHT_TIMES = ['09:30', '09:45', '11:00'] as const;

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

const CLASS_TYPE_OPTIONS: DropdownOption[] = [
  { id: 'lecture', label: 'Lecture', badge: 'Class type' },
  { id: 'lab', label: 'Lab', badge: 'Class type' },
  { id: 'tutorial', label: 'Tutorial', badge: 'Class type' },
];

const REMINDER_OPTIONS: DropdownOption[] = [
  { id: '-1', label: 'Off', badge: 'Reminder' },
  { id: '0', label: 'At class time', badge: 'Reminder' },
  { id: '15', label: '15 minutes before', badge: 'Reminder' },
  { id: '30', label: '30 minutes before', badge: 'Reminder' },
  { id: '60', label: '1 hour before', badge: 'Reminder' },
  { id: '1440', label: '1 day before', badge: 'Reminder' },
];

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

function reminderMinutesToOptionId(value: number) {
  return String(value);
}

function optionIdToReminderMinutes(value: string) {
  return Number(value);
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

function getGridTopFromMinutes(totalMinutes: number) {
  return (totalMinutes - GRID_START_MINUTES) * PIXELS_PER_MINUTE;
}

function getGridTop(timeValue: string) {
  return getGridTopFromMinutes(timeToMinutes(timeValue));
}

function getVisibleDays(activeDay: number, count: number) {
  if (count >= DAY_TABS.length) return [...DAY_TABS];
  const startIndex = DAY_TABS.findIndex((day) => day.value === activeDay);
  const safeStartIndex = startIndex >= 0 ? startIndex : 0;
  return Array.from({ length: count }, (_, offset) => DAY_TABS[(safeStartIndex + offset) % DAY_TABS.length]);
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
      const top = clamp(getGridTop(entry.startTime), 0, GRID_HEIGHT);
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
  dayLabel,
  top,
  height,
  laneIndex,
  laneCount,
  onClick,
}: {
  entry: TimetableEntry;
  module: Module | undefined;
  dayLabel: string;
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
      className="group absolute overflow-hidden rounded-[8px] border border-[color:var(--border)]/45 text-left shadow-[0_8px_24px_-18px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/65 focus-visible:ring-offset-0"
      aria-label={`${module?.code ?? module?.title ?? 'Module'} ${kind.label} on ${dayLabel}, ${formatTimeLabel(entry.startTime)} to ${formatTimeLabel(entry.endTime)}`}
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

      <div className={cn('flex h-full min-w-0 flex-col bg-[color:var(--surface-high)]/70 pl-4 gap-2 px-3 py-2')}>
        <p className={cn('min-w-0 break-words text-[14px] font-semibold leading-tight')} title={module?.code ?? module?.title ?? 'Module'}>
          {module?.code ?? module?.title ?? 'Module'}
        </p>
        <div className={cn('inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium leading-tight text-[14px]', kind.badge)}>
          <Icon className="h-3.5 w-3.5" />
          {kind.label}
        </div>
        <p className={cn('font-medium leading-tight text-[color:var(--muted)] tabular-nums text-[14px]')}>
          {formatTimeLabel(entry.startTime)} - {formatTimeLabel(entry.endTime)}
        </p>
      </div>
    </button>
  );
}

function TimeAxis() {
  const LABEL_HEIGHT = 16;

  const labels = useMemo(() => {
    const values: Array<{ label: string; top: number }> = [];

    // Labels are strict 60-minute intervals from the grid start (08:30, 09:30, ...).
    for (let minutes = GRID_START_MINUTES; minutes <= GRID_END_MINUTES; minutes += 60) {
      values.push({
        label: minutesToTime(minutes),
        top: getGridTopFromMinutes(minutes),
      });
    }

    return values;
  }, []);

  return (
    <div className="relative h-full w-full">
      {labels.map((label) => {
        const adjustedTop = clamp(label.top - LABEL_HEIGHT / 2, 0, GRID_HEIGHT - LABEL_HEIGHT);

        return (
          <div
            key={label.top}
            className="absolute right-1.5 text-[12px] font-semibold tabular-nums leading-none text-[color:var(--text)]/90"
            style={{ top: `${adjustedTop}px` }}
          >
            {label.label}
          </div>
        );
      })}
    </div>
  );
}

export default function Timetable({ modules, entries, onAddEntry, onUpdateEntry, onRemoveEntry }: TimetableProps) {
  const todayDayOfWeek = new Date().getDay();
  const [draft, setDraft] = useState<Draft>(() => ({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '' }));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 0));
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(todayDayOfWeek);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const alignmentTicks = useMemo(() => {
    const highlighted = new Set(GUIDE_HIGHLIGHT_TIMES.map((timeValue) => timeToMinutes(timeValue)));
    const ticks: Array<{ minutes: number; top: number; isMajor: boolean; isHighlighted: boolean }> = [];

    for (let minutes = GRID_START_MINUTES; minutes <= GRID_END_MINUTES; minutes += 30) {
      ticks.push({
        minutes,
        top: getGridTopFromMinutes(minutes),
        isMajor: (minutes - GRID_START_MINUTES) % 60 === 0,
        isHighlighted: highlighted.has(minutes),
      });
    }

    return ticks;
  }, []);

  const highlightRange = useMemo(() => {
    if (editingEntry) {
      return {
        day: editingEntry.dayOfWeek,
        start: timeToMinutes(editingEntry.startTime),
        end: timeToMinutes(editingEntry.endTime),
      };
    }
    if (isAddModalOpen) {
      return {
        day: draft.dayOfWeek,
        start: timeToMinutes(draft.startTime),
        end: timeToMinutes(draft.endTime),
      };
    }
    return null;
  }, [editingEntry, isAddModalOpen, draft]);

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

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(''), 2200);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
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

  const moduleOptions = useMemo<DropdownOption[]>(
    () => modules.map((module) => ({ id: module.id, label: `${module.code} - ${module.title}`, badge: module.code })),
    [modules]
  );

  const visibleDays = DAY_TABS;
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isNowInGridRange = nowMinutes >= GRID_START_MINUTES && nowMinutes <= GRID_END_MINUTES;

  const handleAdd = () => {
    if (!draft.moduleId) return;
    const startMinutes = timeToMinutes(draft.startTime);
    const endMinutes = timeToMinutes(draft.endTime);
    if (endMinutes <= startMinutes) {
      setAddError('End time must be later than start time.');
      return;
    }
    if (hasTimetableConflict(entries, draft)) {
      setAddError('This session overlaps another session on the same day.');
      return;
    }

    setAddError(null);
    onAddEntry(draft);
    setIsAddModalOpen(false);
    setDraft({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '', reminderMinutes: -1 });
    setStatusMessage('Class slot added successfully.');
  };

  const openAdd = (dayOfWeek: number) => {
    setActiveDay(dayOfWeek);
    setDraft({
      ...DEFAULT_DRAFT,
      moduleId: modules[0]?.id ?? '',
      dayOfWeek,
      reminderMinutes: -1,
    });
    setAddError(null);
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
    setEditError(null);
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    const startMinutes = timeToMinutes(editDraft.startTime);
    const endMinutes = timeToMinutes(editDraft.endTime);
    if (endMinutes <= startMinutes) {
      setEditError('End time must be later than start time.');
      return;
    }
    if (hasTimetableConflict(entries, editDraft, editingEntry.id)) {
      setEditError('This update overlaps another session on the same day.');
      return;
    }
    setEditError(null);
    onUpdateEntry(editingEntry.id, editDraft);
    setEditingEntry(null);
    setStatusMessage('Class slot updated successfully.');
  };

  const removeEdit = () => {
    if (!editingEntry) return;
    onRemoveEntry(editingEntry.id);
    setEditingEntry(null);
    setStatusMessage('Class slot removed.');
  };

  const shiftDayWindow = (delta: number) => {
    const currentIndex = DAY_TABS.findIndex((day) => day.value === activeDay);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeCurrentIndex + delta + DAY_TABS.length) % DAY_TABS.length;
    setActiveDay(DAY_TABS[nextIndex].value);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">Timetable</h1>
          <div className="flex items-center gap-2">
            {/* density options removed - always using comfortable spacing */}

            {IS_DEV ? (
              <button
                type="button"
                onClick={() => setShowAlignmentGuides((current) => !current)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                  showAlignmentGuides
                    ? 'border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--text)]'
                    : 'border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--muted)] hover:text-[color:var(--text)]'
                )}
              >
                {showAlignmentGuides ? 'Hide alignment guides' : 'Show alignment guides'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Select timetable day window">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
            onClick={() => shiftDayWindow(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {DAY_TABS.map((day) => {
            const isActive = day.value === activeDay;
            return (
              <button
                key={day.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                  isActive
                    ? 'border-[color:var(--accent)]/45 bg-[color:var(--accent)]/12 text-[color:var(--text)]'
                    : 'border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--muted)] hover:text-[color:var(--text)]'
                )}
                onClick={() => setActiveDay(day.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    shiftDayWindow(-1);
                  }
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    shiftDayWindow(1);
                  }
                }}
              >
                {day.label}
              </button>
            );
          })}

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
            onClick={() => shiftDayWindow(1)}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-2 sm:p-3">
        {/* Removed inner scroll so the whole page scrolls naturally */}
        <div className="overflow-x-auto overflow-y-hidden rounded-2xl" role="region" aria-label="Weekly timetable grid">
          <div className="flex min-w-max gap-2">
            <div
              className="sticky left-0 z-30 shrink-0 bg-[color:var(--surface-low)] pr-1"
              style={{ width: `${TIME_RAIL_WIDTH}px`, height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT + GRID_TOP_GAP}px` }}
            >
              <div style={{ height: `${COLUMN_HEADER_HEIGHT + GRID_TOP_GAP}px` }} />
               <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
                 <TimeAxis />
                 {isNowInGridRange ? (
                   <div className="pointer-events-none absolute right-0 z-20 flex items-center gap-1.5" aria-hidden style={{ top: `${clamp(getGridTopFromMinutes(nowMinutes), 0, GRID_HEIGHT - 1)}px`, transform: 'translateY(-50%)' }}>
                     <div className="h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                     <div className="h-0.5 w-3 bg-[color:var(--accent)]" />
                   </div>
                 ) : null}
               </div>
            </div>

            <div className="flex min-w-0 flex-1 overflow-visible rounded-2xl border border-[color:var(--border)]" role="grid" aria-label="Timetable sessions by day and time">
              {visibleDays.map((day) => {
                const positionedEntries = layoutsByDay[day.value] ?? [];
                const dayLabel = formatDayLabel(day.value);

                return (
                  <div
                    key={day.value}
                    className={cn(
                      'relative flex min-w-[170px] flex-1 flex-col border-r border-[color:var(--border)]/20 last:border-r-0',
                      day.value === todayDayOfWeek && 'bg-[color:var(--accent)]/4'
                    )}
                    style={{ height: `${GRID_HEIGHT + COLUMN_HEADER_HEIGHT + GRID_TOP_GAP}px` }}
                    role="row"
                    aria-label={dayLabel}
                  >
                    <div className={cn('sticky top-0 z-20 flex h-[44px] items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface-low)]/95 px-3 backdrop-blur-sm', day.value === todayDayOfWeek && 'border-b-[color:var(--accent)]/10') }>
                      <div className="min-w-0">
                        <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--muted)]', day.value === todayDayOfWeek ? 'text-[color:var(--accent)]' : '')}>
                          {day.label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAdd(day.value)}
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[color:var(--border)]/45 bg-transparent px-3 text-[11px] font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)]/35 hover:text-[color:var(--text)]"
                        aria-label={`Add slot for ${dayLabel}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div
                      className="relative"
                      style={{
                        marginTop: `${GRID_TOP_GAP}px`,
                        height: `${GRID_HEIGHT}px`,
                        background: 'transparent',
                      }}
                      role="gridcell"
                      aria-label={`${dayLabel} timetable`}
                    >
                       {IS_DEV && showAlignmentGuides ? (
                         <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                           {alignmentTicks.map((tick) => (
                             <div
                               key={tick.minutes}
                               className={cn(
                                 'absolute left-0 right-0',
                                 tick.isMajor
                                   ? 'border-t border-[color:var(--muted)]/35'
                                   : 'border-t border-[color:var(--muted)]/18 border-dashed'
                               )}
                               style={{ top: `${clamp(tick.top, 0, GRID_HEIGHT - 1)}px` }}
                             />
                           ))}

                           {/* Selected session start/end highlight (blue) - show when editing or adding */}
                           {highlightRange && highlightRange.day === day.value ? (
                             <>
                               <div
                                 className="absolute left-0 right-0 border-t-2 border-[color:var(--accent)]"
                                 style={{ top: `${clamp(getGridTopFromMinutes(highlightRange.start), 0, GRID_HEIGHT)}px` }}
                               />
                               <div
                                 className="absolute left-0 right-0 border-t-2 border-[color:var(--accent)]"
                                 style={{ top: `${clamp(getGridTopFromMinutes(highlightRange.end), 0, GRID_HEIGHT)}px` }}
                               />
                               {/* small circular markers for start/end */}
                               <div
                                 className="absolute -left-1.5 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
                                 style={{ top: `${clamp(getGridTopFromMinutes(highlightRange.start), 0, GRID_HEIGHT) - 6}px` }}
                               />
                             </>
                           ) : null}
                         </div>
                       ) : null}

                        {/* Current time line - shows blue line across timetable only when alignment guides are ON */}
                        {isNowInGridRange && showAlignmentGuides ? (
                          <div className="pointer-events-none absolute left-0 right-0 z-10" aria-hidden style={{ top: `${clamp(getGridTopFromMinutes(nowMinutes), 0, GRID_HEIGHT - 1)}px`, transform: 'translateY(-50%)' }}>
                            <div className="border-t-2 border-[color:var(--accent)]" />
                          </div>
                        ) : null}


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
                            dayLabel={dayLabel}
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
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setAddError(null);
          setIsAddModalOpen(false);
        }}
        title="Add timetable slot"
        subtitle={`Add a class for ${formatDayLabel(draft.dayOfWeek)}`}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          {addError ? (
            <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100" role="alert" aria-live="assertive">
              {addError}
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <Dropdown
              options={[{ id: '', label: 'Select a module', badge: 'Module' }, ...moduleOptions]}
              selectedId={draft.moduleId}
              onSelect={(value) => setDraft((current) => ({ ...current, moduleId: value }))}
              placeholder="Select a module"
            />
          </label>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Selected day</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{formatDayLabel(draft.dayOfWeek)}</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Class type</span>
            <Dropdown
              options={CLASS_TYPE_OPTIONS}
              selectedId={draft.kind}
              onSelect={(value) => setDraft((current) => ({ ...current, kind: value as Kind }))}
              placeholder="Select class type"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeWheelPicker label="Start time" value={draft.startTime} onChange={(value) => setDraft((current) => ({ ...current, startTime: value }))} />
            <TimeWheelPicker label="End time" value={draft.endTime} onChange={(value) => setDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <Dropdown
              options={REMINDER_OPTIONS}
              selectedId={reminderMinutesToOptionId(draft.reminderMinutes)}
              onSelect={(value) => setDraft((current) => ({ ...current, reminderMinutes: optionIdToReminderMinutes(value) }))}
              placeholder="Off"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleAdd} variant="secondary" className="flex-1">
              Add class slot
            </Button>
            <Button onClick={() => {
              setAddError(null);
              setIsAddModalOpen(false);
            }} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingEntry !== null}
        onClose={() => {
          setEditError(null);
          setEditingEntry(null);
        }}
        title="Edit timetable slot"
        subtitle="Update or remove this class slot"
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          {editError ? (
            <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100" role="alert" aria-live="assertive">
              {editError}
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Academic module</span>
            <Dropdown
              options={moduleOptions}
              selectedId={editDraft.moduleId}
              onSelect={(value) => setEditDraft((current) => ({ ...current, moduleId: value }))}
              placeholder="Select a module"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Class type</span>
            <Dropdown
              options={CLASS_TYPE_OPTIONS}
              selectedId={editDraft.kind}
              onSelect={(value) => setEditDraft((current) => ({ ...current, kind: value as Kind }))}
              placeholder="Select class type"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeWheelPicker label="Start time" value={editDraft.startTime} onChange={(value) => setEditDraft((current) => ({ ...current, startTime: value }))} />
            <TimeWheelPicker label="End time" value={editDraft.endTime} onChange={(value) => setEditDraft((current) => ({ ...current, endTime: value }))} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-[color:var(--muted)]">Reminder offset</span>
            <Dropdown
              options={REMINDER_OPTIONS}
              selectedId={reminderMinutesToOptionId(editDraft.reminderMinutes)}
              onSelect={(value) => setEditDraft((current) => ({ ...current, reminderMinutes: optionIdToReminderMinutes(value) }))}
              placeholder="Off"
            />
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
