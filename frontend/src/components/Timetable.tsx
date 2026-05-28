import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Clock, Edit2, GraduationCap, Beaker, Users } from 'lucide-react';
import { Module, TimetableEntry } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
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
  lecture: { label: 'Lecture' },
  lab: { label: 'Lab' },
  tutorial: { label: 'Tutorial' },
} as const;

type Kind = keyof typeof KIND_META;

// Timeline math configuration
const TIMETABLE_START_MINUTES = 8 * 60 + 30; // 08:30 = 510 minutes
const TIMETABLE_END_MINUTES = 20 * 60 + 30;  // 20:30 = 1230 minutes
const PIXELS_PER_MINUTE = 1.5;                  // Scale factor
const TIMELINE_HEIGHT = (TIMETABLE_END_MINUTES - TIMETABLE_START_MINUTES) * PIXELS_PER_MINUTE; // 1080px

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-[color:var(--module-blue-bg)]/20 hover:bg-[color:var(--module-blue-bg)]/35',
    border: 'border-[color:var(--module-blue-border)]/20 hover:border-[color:var(--module-blue-border)]/60',
    leftBar: 'bg-[color:var(--module-blue-text)]',
    text: 'text-[color:var(--module-blue-text)]',
    badge: 'bg-[color:var(--module-blue-bg)] text-[color:var(--module-blue-text)] border-[color:var(--module-blue-border)]/20',
    glow: 'hover:shadow-[0_8px_30px_rgba(56,189,248,0.06)]',
  },
  amber: {
    bg: 'bg-[color:var(--module-amber-bg)]/20 hover:bg-[color:var(--module-amber-bg)]/35',
    border: 'border-[color:var(--module-amber-border)]/20 hover:border-[color:var(--module-amber-border)]/60',
    leftBar: 'bg-[color:var(--module-amber-text)]',
    text: 'text-[color:var(--module-amber-text)]',
    badge: 'bg-[color:var(--module-amber-bg)] text-[color:var(--module-amber-text)] border-[color:var(--module-amber-border)]/20',
    glow: 'hover:shadow-[0_8px_30px_rgba(251,191,36,0.06)]',
  },
  emerald: {
    bg: 'bg-[color:var(--module-emerald-bg)]/20 hover:bg-[color:var(--module-emerald-bg)]/35',
    border: 'border-[color:var(--module-emerald-border)]/20 hover:border-[color:var(--module-emerald-border)]/60',
    leftBar: 'bg-[color:var(--module-emerald-text)]',
    text: 'text-[color:var(--module-emerald-text)]',
    badge: 'bg-[color:var(--module-emerald-bg)] text-[color:var(--module-emerald-text)] border-[color:var(--module-emerald-border)]/20',
    glow: 'hover:shadow-[0_8px_30px_rgba(52,211,153,0.06)]',
  },
  purple: {
    bg: 'bg-[color:var(--module-purple-bg)]/20 hover:bg-[color:var(--module-purple-bg)]/35',
    border: 'border-[color:var(--module-purple-border)]/20 hover:border-[color:var(--module-purple-border)]/60',
    leftBar: 'bg-[color:var(--module-purple-text)]',
    text: 'text-[color:var(--module-purple-text)]',
    badge: 'bg-[color:var(--module-purple-bg)] text-[color:var(--module-purple-text)] border-[color:var(--module-purple-border)]/20',
    glow: 'hover:shadow-[0_8px_30px_rgba(139,92,246,0.06)]',
  },
  rose: {
    bg: 'bg-[color:var(--module-rose-bg)]/20 hover:bg-[color:var(--module-rose-bg)]/35',
    border: 'border-[color:var(--module-rose-border)]/20 hover:border-[color:var(--module-rose-border)]/60',
    leftBar: 'bg-[color:var(--module-rose-text)]',
    text: 'text-[color:var(--module-rose-text)]',
    badge: 'bg-[color:var(--module-rose-bg)] text-[color:var(--module-rose-text)] border-[color:var(--module-rose-border)]/20',
    glow: 'hover:shadow-[0_8px_30px_rgba(251,113,133,0.06)]',
  },
} as const;

type Draft = {
  moduleId: string;
  dayOfWeek: number;
  kind: Kind;
  startTime: string;
  endTime: string;
};

const DEFAULT_DRAFT: Draft = {
  moduleId: '',
  dayOfWeek: 1,
  kind: 'lecture',
  startTime: '08:30',
  endTime: '10:00',
};

// --- Time Helpers ---
function timeToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(':');
  return Number(hoursRaw || 0) * 60 + Number(minutesRaw || 0);
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function splitTime(value: string) {
  const [hours = '08', minutes = '30'] = value.split(':');
  return {
    hour: String(Number(hours)).padStart(2, '0'),
    minute: String(Number(minutes)).padStart(2, '0'),
  };
}

function getTopOffset(timeStr: string): number {
  const minutes = timeToMinutes(timeStr);
  const diff = minutes - TIMETABLE_START_MINUTES;
  return diff * PIXELS_PER_MINUTE;
}

function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const mins = timeToMinutes(timeStr);
  return minutesToTime(mins + minsToAdd);
}

// Get dates for the current week starting from Monday
function getWeekDates() {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const dates: Record<number, { dateNum: number; formattedDate: string; isToday: boolean }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayVal = d.getDay();
    dates[dayVal] = {
      dateNum: d.getDate(),
      formattedDate: `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      isToday: d.toDateString() === now.toDateString(),
    };
  }
  return dates;
}

// --- Layout Engine ---
interface PositionedEntry {
  entry: TimetableEntry;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
}

function buildDayLayout(dayEntries: TimetableEntry[]): PositionedEntry[] {
  const sorted = [...dayEntries].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const clusters: TimetableEntry[][] = [];

  for (const entry of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster) {
      clusters.push([entry]);
      continue;
    }

    const clusterEnd = Math.max(...lastCluster.map((e) => timeToMinutes(e.endTime)));
    if (timeToMinutes(entry.startTime) < clusterEnd) {
      lastCluster.push(entry);
    } else {
      clusters.push([entry]);
    }
  }

  return clusters.flatMap((cluster) => {
    const lanes: TimetableEntry[][] = [];

    for (const entry of cluster) {
      const laneIndex = lanes.findIndex((lane) =>
        lane.every((laneEntry) =>
          timeToMinutes(entry.startTime) >= timeToMinutes(laneEntry.endTime) ||
          timeToMinutes(entry.endTime) <= timeToMinutes(laneEntry.startTime)
        )
      );
      if (laneIndex === -1) {
        lanes.push([entry]);
      } else {
        lanes[laneIndex].push(entry);
      }
    }

    const laneCount = Math.max(1, lanes.length);

    return cluster.map((entry) => {
      const laneIndex = lanes.findIndex((lane) => lane.includes(entry));
      const startMins = timeToMinutes(entry.startTime);
      const endMins = timeToMinutes(entry.endTime);
      
      const displayStart = Math.max(startMins, TIMETABLE_START_MINUTES);
      const displayEnd = Math.min(endMins, TIMETABLE_END_MINUTES);
      
      const top = (displayStart - TIMETABLE_START_MINUTES) * PIXELS_PER_MINUTE;
      const height = (displayEnd - displayStart) * PIXELS_PER_MINUTE;

      return {
        entry,
        top,
        height,
        laneIndex: laneIndex < 0 ? 0 : laneIndex,
        laneCount,
      };
    });
  });
}

// --- iOS-Style Snap Scroll Wheel ---
interface ScrollWheelProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

export function ScrollWheel({ options, value, onChange }: ScrollWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalScrollRef = useRef(false);
  const isMountedRef = useRef(false);
  const itemHeight = 40; // px

  // Sync scroll position when value changes from outside
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const index = options.indexOf(value);
    if (index === -1) return;

    const targetScroll = index * itemHeight;
    if (Math.abs(container.scrollTop - targetScroll) <= 2) return;

    const performScroll = () => {
      isInternalScrollRef.current = true;
      container.scrollTo({ top: targetScroll, behavior: 'auto' });
      requestAnimationFrame(() => {
        setTimeout(() => {
          isInternalScrollRef.current = false;
        }, 50);
      });
    };

    // Use a delay for the very first scroll on mount to avoid parent modal scrolling / autofocus bugs
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      const timer = setTimeout(performScroll, 100);
      return () => clearTimeout(timer);
    } else {
      performScroll();
    }
  }, [value, options]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // If it's a programmatic scroll, don't trigger state updates
    if (isInternalScrollRef.current) return;

    const container = e.currentTarget;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to detect scroll end
    timeoutRef.current = setTimeout(() => {
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      if (index >= 0 && index < options.length) {
        const selected = options[index];
        if (selected && selected !== value) {
          onChange(selected);
        }
      }
    }, 85); // Debounce to allow user to drag smoothly without rendering lockups
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative h-[120px] w-20 overflow-hidden bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] shadow-sm shrink-0">
      {/* Center highlighter */}
      <div className="absolute top-[40px] left-0 right-0 h-[40px] border-y border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 pointer-events-none" />
      
      {/* Fade overlay */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[color:var(--surface)] to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[color:var(--surface)] to-transparent pointer-events-none z-10" />
      
      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory py-10 no-scrollbar flex flex-col"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {options.map((option) => {
          const isActive = option === value;
          return (
            <div
              key={option}
              onClick={() => {
                if (!isInternalScrollRef.current) onChange(option);
              }}
              className={cn(
                "h-10 flex items-center justify-center text-sm font-semibold snap-center cursor-pointer select-none transition-colors duration-150 shrink-0",
                isActive ? "text-[color:var(--accent)] text-base font-bold" : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              )}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Time Wheel Selector Combines Wheels ---
interface TimeWheelPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export function TimeWheelPicker({ label, value, onChange }: TimeWheelPickerProps) {
  const parts = splitTime(value);

  // Visible slots range 08:00 to 21:00 to give flexibility in choosing times bordering the timeline range
  const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => String(8 + i).padStart(2, '0')), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${parts.minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${parts.hour}:${newMinute}`);
  };

  return (
    <div className="flex items-center justify-between gap-4 w-full select-none">
      <span className="text-sm font-semibold text-[color:var(--text)] pl-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <ScrollWheel options={hours} value={parts.hour} onChange={handleHourChange} />
        <span className="text-lg font-bold text-[color:var(--muted)] select-none px-1">:</span>
        <ScrollWheel options={minutes} value={parts.minute} onChange={handleMinuteChange} />
      </div>
    </div>
  );
}

// --- Custom Module List Selector Component (No clipping, direct visual selects) ---
interface ModuleSelectorProps {
  modules: Module[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function ModuleSelectorList({ modules, selectedId, onSelect }: ModuleSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[color:var(--muted)] pl-1">Academic module</span>
      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {modules.length === 0 ? (
          <div className="text-xs text-[color:var(--muted)] p-4 border border-dashed border-[color:var(--border)] rounded-2xl text-center">
            No modules found. Please create modules in the Academic page.
          </div>
        ) : (
          modules.map((m) => {
            const isSelected = selectedId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-3 transition-all text-left w-full cursor-pointer",
                  isSelected
                    ? "bg-[color:var(--surface-high)] border-[color:var(--accent)] text-[color:var(--text)] shadow-sm"
                    : "bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:border-[color:var(--border-focus)]/30"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0 shadow-sm",
                    m.color === 'blue' && 'bg-[color:var(--module-blue-text)]',
                    m.color === 'amber' && 'bg-[color:var(--module-amber-text)]',
                    m.color === 'emerald' && 'bg-[color:var(--module-emerald-text)]',
                    m.color === 'purple' && 'bg-[color:var(--module-purple-text)]',
                    m.color === 'rose' && 'bg-[color:var(--module-rose-text)]'
                  )} />
                  <span className="text-xs font-bold tracking-tight">{m.code}</span>
                  <span className="text-xs opacity-75 truncate max-w-[220px] font-medium">{m.title}</span>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)]" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- Main Timetable Component ---
export default function Timetable({
  modules,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: TimetableProps) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...DEFAULT_DRAFT, moduleId: modules[0]?.id ?? '' }));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [now, setNow] = useState(() => new Date());

  // Track system clock for live indicator line
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Update default module selection when items list loads
  useEffect(() => {
    if (!draft.moduleId && modules[0]?.id) {
      setDraft((curr) => ({ ...curr, moduleId: modules[0].id }));
    }
    if (!editDraft.moduleId && modules[0]?.id) {
      setEditDraft((curr) => ({ ...curr, moduleId: modules[0].id }));
    }
  }, [modules, draft.moduleId, editDraft.moduleId]);

  // Organize elements by day
  const entriesByDay = useMemo(() => {
    const map: Record<number, TimetableEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] };
    entries.forEach((e) => {
      if (map[e.dayOfWeek]) {
        map[e.dayOfWeek].push(e);
      }
    });
    return map;
  }, [entries]);

  // Compute positioned layers
  const layoutsByDay = useMemo(() => {
    const map: Record<number, PositionedEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] };
    DAY_TABS.forEach((day) => {
      map[day.value] = buildDayLayout(entriesByDay[day.value] ?? []);
    });
    return map;
  }, [entriesByDay]);

  const dates = useMemo(() => getWeekDates(), [now]);

  // Generate background rule markings every 30 minutes
  const timeSteps = useMemo(() => {
    const steps = [];
    for (let min = TIMETABLE_START_MINUTES; min <= TIMETABLE_END_MINUTES; min += 30) {
      steps.push({
        time: minutesToTime(min),
        minutes: min,
      });
    }
    return steps;
  }, []);

  // Add event handler
  const handleAdd = () => {
    if (!draft.moduleId) return;
    try {
      onAddEntry({
        moduleId: draft.moduleId,
        dayOfWeek: draft.dayOfWeek,
        kind: draft.kind,
        startTime: draft.startTime,
        endTime: draft.endTime,
        reminderMinutes: -1, // default reminders disabled
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add timetable slot:', err);
    }
  };

  // Open add popover pre-assigning day value
  const openAdd = (dayOfWeek: number) => {
    setDraft({
      moduleId: modules[0]?.id ?? '',
      dayOfWeek,
      kind: 'lecture',
      startTime: '08:30',
      endTime: '10:00',
    });
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEditDraft({
      moduleId: entry.moduleId,
      dayOfWeek: entry.dayOfWeek,
      kind: entry.kind,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  };

  // Save changes
  const saveEdit = () => {
    if (!editingEntry) return;
    try {
      onUpdateEntry(editingEntry.id, {
        moduleId: editDraft.moduleId,
        dayOfWeek: editDraft.dayOfWeek,
        kind: editDraft.kind,
        startTime: editDraft.startTime,
        endTime: editDraft.endTime,
        reminderMinutes: -1,
      });
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to update timetable slot:', err);
    }
  };

  // Remove entry
  const removeEdit = () => {
    if (!editingEntry) return;
    try {
      onRemoveEntry(editingEntry.id);
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to delete timetable slot:', err);
    }
  };

  // Safe handlers to prevent overlap issues
  const handleDraftStartChange = (val: string) => {
    setDraft((curr) => {
      const updates: Partial<Draft> = { startTime: val };
      if (timeToMinutes(val) >= timeToMinutes(curr.endTime)) {
        updates.endTime = addMinutesToTime(val, 90);
      }
      return { ...curr, ...updates };
    });
  };

  const handleDraftEndChange = (val: string) => {
    setDraft((curr) => {
      const updates: Partial<Draft> = { endTime: val };
      if (timeToMinutes(val) <= timeToMinutes(curr.startTime)) {
        updates.startTime = addMinutesToTime(val, -90);
      }
      return { ...curr, ...updates };
    });
  };

  const handleEditDraftStartChange = (val: string) => {
    setEditDraft((curr) => {
      const updates: Partial<Draft> = { startTime: val };
      if (timeToMinutes(val) >= timeToMinutes(curr.endTime)) {
        updates.endTime = addMinutesToTime(val, 90);
      }
      return { ...curr, ...updates };
    });
  };

  const handleEditDraftEndChange = (val: string) => {
    setEditDraft((curr) => {
      const updates: Partial<Draft> = { endTime: val };
      if (timeToMinutes(val) <= timeToMinutes(curr.startTime)) {
        updates.startTime = addMinutesToTime(val, -90);
      }
      return { ...curr, ...updates };
    });
  };

  // Time indicator math
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const showTimeIndicator = nowMins >= TIMETABLE_START_MINUTES && nowMins <= TIMETABLE_END_MINUTES;
  const timeIndicatorTop = showTimeIndicator ? (nowMins - TIMETABLE_START_MINUTES) * PIXELS_PER_MINUTE : 0;
  const todayDayIndex = now.getDay(); // 0 is Sunday, 1 is Monday

  // Dynamic Lucide type icons inside cards (matching reference icons)
  const getIcon = (kind: Kind) => {
    switch (kind) {
      case 'lecture':
        return <GraduationCap className="h-4 w-4 shrink-0" />;
      case 'lab':
        return <Beaker className="h-4 w-4 shrink-0" />;
      case 'tutorial':
        return <Users className="h-4 w-4 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header aligned with Reference Image */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[color:var(--border)]/35 pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--text)] font-heading">
            Stay up to date, Loch
          </h1>
          <p className="text-sm text-[color:var(--muted)]">
            Overview of your academic calendar schedule and weekly modules.
          </p>
        </div>
        
        {/* Aligning Tools */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => openAdd(1)} leftIcon={<Plus className="h-4.5 w-4.5" />} variant="primary">
            Add slot
          </Button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="rounded-[2.2rem] border border-[color:var(--border)] bg-[color:var(--surface-low)]/20 p-2 shadow-2xl backdrop-blur-md">
        {/* Horizontal & Vertical Scroll Area */}
        <div className="overflow-x-auto overflow-y-auto no-scrollbar max-h-[calc(100vh-260px)] rounded-[1.8rem] relative">
          <div className="w-full min-w-0 relative flex flex-col select-none">
            
            {/* Sticky Header Row */}
            <div className="sticky top-0 z-30 flex bg-[color:var(--surface-low)] border-b border-[color:var(--border)] shrink-0 shadow-sm">
              {/* Top-left spacer intersection */}
              <div className="w-[60px] shrink-0 border-r border-[color:var(--border)]/40 bg-[color:var(--surface-low)] sticky left-0 z-40" />
              
              {/* Days header list */}
              <div className="flex-1 flex">
                {DAY_TABS.map((day) => {
                  const dateInfo = dates[day.value];
                  const isToday = dateInfo?.isToday ?? false;
                  return (
                    <div
                      key={day.value}
                      className={cn(
                        "flex-1 min-w-[80px] group/header relative py-4 flex flex-col items-center justify-center border-r border-[color:var(--border)]/15 last:border-r-0 text-center"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isToday ? "text-[color:var(--accent)] font-extrabold" : "text-[color:var(--muted)]"
                      )}>
                        {day.label}
                      </span>
                      <span className={cn(
                        "text-sm font-bold mt-1 px-3 py-0.5 rounded-full select-none",
                        isToday ? "bg-[color:var(--accent)] text-white shadow-md shadow-[color:var(--accent)]/30" : "text-[color:var(--text)]"
                      )}>
                        {dateInfo?.dateNum ?? formatDayLabel(day.value).substring(0, 3)}
                      </span>
                      
                      {/* Hover action add shortcut button */}
                      <button
                        onClick={() => openAdd(day.value)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-[color:var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--text)] cursor-pointer"
                        title={`Add class for ${day.label}`}
                      >
                        <Plus className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continuous Grid Body */}
            <div className="flex relative shrink-0" style={{ height: `${TIMELINE_HEIGHT}px`, minHeight: `${TIMELINE_HEIGHT}px` }}>
              
              {/* Left Sticky Time Axis Rail */}
              <div className="w-[60px] shrink-0 sticky left-0 z-20 bg-[color:var(--surface-low)] border-r border-[color:var(--border)]/40 relative select-none">
                {timeSteps.map((step) => {
                  const top = getTopOffset(step.time);
                  const isHour = step.minutes % 60 === 0;
                  return (
                    <div
                      key={step.time}
                      className="absolute right-2.5 -translate-y-1/2 flex items-center justify-end"
                      style={{ top: `${top}px` }}
                    >
                      <span className={cn(
                        "font-medium tabular-nums text-right block w-full",
                        isHour ? "text-xs font-semibold text-[color:var(--text)]/85" : "text-[10px] text-[color:var(--muted)]/50 font-normal"
                      )}>
                        {isHour ? step.time : ":30"}
                      </span>
                    </div>
                  );
                })}
                
                {/* Current Time Axis Badge overlay */}
                {showTimeIndicator && (
                  <div
                    className="absolute right-1 -translate-y-1/2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow shadow-rose-500/30 z-20 pointer-events-none tabular-nums animate-pulse"
                    style={{ top: `${timeIndicatorTop}px` }}
                  >
                    {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                  </div>
                )}
              </div>

              {/* Day columns & Cards area */}
              <div className="flex-1 flex relative">
                
                {/* Horizontal guide line grids */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {timeSteps.map((step) => {
                    const top = getTopOffset(step.time);
                    const isHour = step.minutes % 60 === 0;
                    return (
                      <div
                        key={step.time}
                        className={cn(
                          "absolute left-0 right-0 border-t",
                          isHour ? "border-[color:var(--border)]/30" : "border-[color:var(--border)]/10 border-dashed"
                        )}
                        style={{ top: `${top}px` }}
                      />
                    );
                  })}
                </div>

                {/* Live clock horizontal line marker */}
                {showTimeIndicator && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-rose-500/60 pointer-events-none z-10 shadow-sm"
                    style={{ top: `${timeIndicatorTop}px` }}
                  />
                )}

                {/* Vertical Day Columns containing events */}
                {DAY_TABS.map((day) => {
                  const positionedEntries = layoutsByDay[day.value] ?? [];
                  return (
                    <div
                      key={day.value}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          openAdd(day.value);
                        }
                      }}
                      className="flex-1 min-w-[80px] relative h-full border-r border-[color:var(--border)]/15 last:border-r-0 hover:bg-white/[0.005] transition-colors cursor-pointer group"
                    >
                      {/* Pulsing indicator marker dot at intersection */}
                      {showTimeIndicator && day.value === todayDayIndex && (
                        <div
                          className="absolute left-0 w-2.5 h-2.5 -translate-x-1.5 -translate-y-1 rounded-full bg-rose-500 shadow shadow-rose-500/50 animate-pulse pointer-events-none z-20"
                          style={{ top: `${timeIndicatorTop}px` }}
                        />
                      )}

                      {/* Render absolute positioned session cards */}
                      {positionedEntries.map(({ entry, top, height, laneIndex, laneCount }) => {
                        const module = modules.find((m) => m.id === entry.moduleId);
                        const colorKey = module?.color ?? 'blue';
                        const colors = COLOR_CLASSES[colorKey] ?? COLOR_CLASSES.blue;
                        
                        const currentMinutes = now.getHours() * 60 + now.getMinutes();
                        const startMinutes = timeToMinutes(entry.startTime);
                        const endMinutes = timeToMinutes(entry.endTime);
                        const isActiveNow = day.value === todayDayIndex && currentMinutes >= startMinutes && currentMinutes <= endMinutes;

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => openEdit(entry)}
                            className={cn(
                              "absolute rounded-2xl border text-left pl-4 pr-3 py-3 flex flex-col justify-between overflow-hidden transition-all duration-200 group/card",
                              "hover:scale-[1.01] hover:-translate-y-0.5 shadow-sm active:scale-[0.99]",
                              colors.bg,
                              colors.border,
                              colors.glow,
                              "cursor-pointer"
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              left: `calc(${(laneIndex * 100) / laneCount}% + 3px)`,
                              width: `calc(${100 / laneCount}% - 6px)`,
                              zIndex: 10 + laneIndex,
                            }}
                          >
                            <div className="flex flex-col h-full justify-between w-full relative min-w-0">
                              {/* Left vertical color bar - Notion/Apple Calendar style */}
                              <div className={cn("absolute left-[-16px] top-[-12px] bottom-[-12px] w-1 rounded-l-2xl", colors.leftBar)} />

                              <div className="flex flex-col gap-1 w-full flex-1 min-w-0">
                                {/* Header type badge & edit icon */}
                                <div className="flex items-center justify-between gap-1 w-full shrink-0 min-w-0">
                                  <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider min-w-0", colors.text)} title={entry.kind}>
                                    {getIcon(entry.kind)}
                                    <span className="hidden sm:inline truncate">{entry.kind}</span>
                                  </div>
                                  
                                  {isActiveNow && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                  )}
                                </div>

                                {/* Title / Module code */}
                                <div className="min-w-0 flex-1 my-0.5 flex flex-col justify-center">
                                  <p className="text-xs sm:text-sm font-bold text-[color:var(--text)] truncate tracking-tight" title={module ? `${module.code} - ${module.title}` : 'Module'}>
                                    {module ? module.code : 'Module'}
                                  </p>
                                  {height > 65 && module && (
                                    <p className="text-[10px] text-[color:var(--muted)] truncate font-semibold">
                                      {module.title}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Time Range footer */}
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-[color:var(--muted)] shrink-0 pt-1 border-t border-[color:var(--border)]/10 min-w-0">
                                <span className="tabular-nums truncate">{entry.startTime} - {entry.endTime}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD TIMETABLE SLOT MODAL --- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add class slot"
        subtitle="Set standard weekly class timing parameters"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-5">
          {/* Custom Module List Selector (Resolves bad native select contrast & empty options) */}
          <ModuleSelectorList
            modules={modules}
            selectedId={draft.moduleId}
            onSelect={(id) => setDraft((curr) => ({ ...curr, moduleId: id }))}
          />

          {/* Segmented Weekday Pill Bar */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[color:var(--muted)] pl-1">Day of the week</span>
            <div className="flex rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-1 gap-1 justify-between select-none">
              {DAY_TABS.map((day) => {
                const isActive = draft.dayOfWeek === day.value;
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setDraft((curr) => ({ ...curr, dayOfWeek: day.value }))}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer",
                      isActive
                        ? "bg-[color:var(--accent)] text-white shadow-sm font-extrabold"
                        : "text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-high)]/60"
                    )}
                    title={formatDayLabel(day.value)}
                  >
                    {day.label[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segmented Class Type selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[color:var(--muted)] pl-1">Class type</span>
            <div className="flex rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-1 gap-1 select-none">
              {(['lecture', 'lab', 'tutorial'] as Kind[]).map((kind) => {
                const isActive = draft.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDraft((curr) => ({ ...curr, kind }))}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer",
                      isActive
                        ? "bg-[color:var(--surface-high)] text-[color:var(--text)] border border-[color:var(--border)]/30 shadow-sm"
                        : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
                    )}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
          </div>

          {/* iOS-Style Wheel Picker for Times (Stacked vertically to prevent overflow and squishing) */}
          <div className="flex flex-col gap-4 p-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl">
            <TimeWheelPicker label="Start Time" value={draft.startTime} onChange={handleDraftStartChange} />
            <div className="border-t border-[color:var(--border)]/15 my-0.5" />
            <TimeWheelPicker label="End Time" value={draft.endTime} onChange={handleDraftEndChange} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleAdd} variant="primary" className="flex-1 font-semibold" disabled={!draft.moduleId}>
              Add class slot
            </Button>
            <Button onClick={() => setIsAddModalOpen(false)} variant="secondary" className="font-semibold">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- EDIT TIMETABLE SLOT MODAL --- */}
      <Modal
        isOpen={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        title="Edit timetable slot"
        subtitle="Modify settings or delete this class slot"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-5">
          {/* Custom Module Selector */}
          <ModuleSelectorList
            modules={modules}
            selectedId={editDraft.moduleId}
            onSelect={(id) => setEditDraft((curr) => ({ ...curr, moduleId: id }))}
          />

          {/* Segmented Weekday Pill Bar */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[color:var(--muted)] pl-1">Day of the week</span>
            <div className="flex rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-1 gap-1 justify-between select-none">
              {DAY_TABS.map((day) => {
                const isActive = editDraft.dayOfWeek === day.value;
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setEditDraft((curr) => ({ ...curr, dayOfWeek: day.value }))}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer",
                      isActive
                        ? "bg-[color:var(--accent)] text-white shadow-sm font-extrabold"
                        : "text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-high)]/60"
                    )}
                    title={formatDayLabel(day.value)}
                  >
                    {day.label[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segmented Class Type selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[color:var(--muted)] pl-1">Class type</span>
            <div className="flex rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-1 gap-1 select-none">
              {(['lecture', 'lab', 'tutorial'] as Kind[]).map((kind) => {
                const isActive = editDraft.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setEditDraft((curr) => ({ ...curr, kind }))}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer",
                      isActive
                        ? "bg-[color:var(--surface-high)] text-[color:var(--text)] border border-[color:var(--border)]/30 shadow-sm"
                        : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
                    )}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
          </div>

          {/* iOS-Style Wheel Picker for Times (Stacked vertically to prevent overflow and squishing) */}
          <div className="flex flex-col gap-4 p-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl">
            <TimeWheelPicker label="Start Time" value={editDraft.startTime} onChange={handleEditDraftStartChange} />
            <div className="border-t border-[color:var(--border)]/15 my-0.5" />
            <TimeWheelPicker label="End Time" value={editDraft.endTime} onChange={handleEditDraftEndChange} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={saveEdit} variant="primary" className="flex-1 font-semibold">
              Save changes
            </Button>
            <Button onClick={removeEdit} variant="danger" className="font-semibold" leftIcon={<Trash2 className="h-4.5 w-4.5" />}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
