import { v4 as uuidv4 } from 'uuid';
import { TimetableEntry, TimetableOccurrence } from '../types';

const TIMETABLE_STORAGE_KEY = 'my_notion_timetable_entries';

export function loadTimetableEntries(): TimetableEntry[] {
  try {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimetableEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTimetableEntries(entries: TimetableEntry[]) {
  localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(entries));
}

export function createTimetableEntry(entry: Omit<TimetableEntry, 'id'>): TimetableEntry {
  return { id: uuidv4(), ...entry };
}

export function addTimetableEntry(entry: Omit<TimetableEntry, 'id'>): TimetableEntry {
  const nextEntry = createTimetableEntry(entry);
  const current = loadTimetableEntries();
  saveTimetableEntries([...current, nextEntry]);
  return nextEntry;
}

export function removeTimetableEntry(id: string) {
  saveTimetableEntries(loadTimetableEntries().filter((entry) => entry.id !== id));
}

export function updateTimetableEntry(id: string, updates: Partial<Omit<TimetableEntry, 'id'>>) {
  const entries = loadTimetableEntries();
  const next = entries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry));
  saveTimetableEntries(next);
}

function buildDateFromDay(baseDate: Date, dayOfWeek: number) {
  const date = new Date(baseDate);
  const delta = (dayOfWeek - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function generateTimetableOccurrences(entries: TimetableEntry[], now = new Date(), daysAhead = 7): TimetableOccurrence[] {
  const occurrences: TimetableOccurrence[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dayOfWeek = date.getDay();

    entries
      .filter((entry) => entry.dayOfWeek === dayOfWeek)
      .forEach((entry) => {
        const [startHours, startMinutes] = entry.startTime.split(':').map((part) => Number(part));
        const [endHours, endMinutes] = entry.endTime.split(':').map((part) => Number(part));
        const startTime = new Date(date);
        startTime.setHours(startHours || 0, startMinutes || 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(endHours || 0, endMinutes || 0, 0, 0);

        occurrences.push({
          id: `tt-${entry.id}-${startTime.toISOString()}`,
          entryId: entry.id,
          moduleId: entry.moduleId,
          kind: entry.kind,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          reminderMinutes: entry.reminderMinutes,
          room: entry.room,
        });
      });
  }

  return occurrences.sort((left, right) => left.startTime.localeCompare(right.startTime));
}

export function formatDayLabel(dayOfWeek: number) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek] ?? 'Sunday';
}