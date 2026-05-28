import { addDays, format, formatDistanceToNowStrict, isAfter, isBefore, isSameDay, parseISO, subMinutes } from 'date-fns';
import { Event, Module, Task } from '../types';

export type WorkspaceTab = 'home' | 'academic' | 'personal' | 'timetable' | 'calendar' | 'settings' | 'profile' | 'notifications';

export type WorkspaceNotificationKind = 'task' | 'event';

export type WorkspaceNotificationSeverity = 'overdue' | 'today' | 'upcoming' | 'later';

export interface WorkspaceNotificationItem {
  id: string;
  kind: WorkspaceNotificationKind;
  title: string;
  subtitle: string;
  detail: string;
  targetTab: WorkspaceTab;
  moduleId?: string | null;
  dueAt: Date;
  severity: WorkspaceNotificationSeverity;
  isRead: boolean;
}

function safeParseDate(value: string) {
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function formatWhen(date: Date, now: Date) {
  const dateLabel = format(date, 'MMM d');
  const timeLabel = format(date, 'p');

  if (isSameDay(date, now)) {
    return `Today · ${timeLabel}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, tomorrow)) {
    return `Tomorrow · ${timeLabel}`;
  }

  return `${dateLabel} · ${timeLabel}`;
}

function formatRelativeDue(date: Date, now: Date) {
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (diffMinutes < 0) {
    return `Overdue by ${formatDistanceToNowStrict(date, { addSuffix: false })}`;
  }
  if (diffMinutes < 60) {
    return `In ${Math.max(1, diffMinutes)} min`;
  }
  return `Due ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

function getSeverity(date: Date, now: Date): WorkspaceNotificationSeverity {
  if (isBefore(date, now)) return 'overdue';
  if (isSameDay(date, now)) return 'today';
  const inThreeDays = addDays(now, 3);
  if (isBefore(date, inThreeDays) || isSameDay(date, inThreeDays)) return 'upcoming';
  return 'later';
}

export function buildWorkspaceNotifications({
  tasks,
  events,
  modules,
  readNotificationIds,
  now = new Date(),
}: {
  tasks: Task[];
  events: Event[];
  modules: Module[];
  readNotificationIds: string[];
  now?: Date;
}): WorkspaceNotificationItem[] {
  const items: WorkspaceNotificationItem[] = [];

  for (const task of tasks) {
    if (task.done || !task.dueDate) continue;
    const dueAt = safeParseDate(task.dueDate);
    if (!dueAt) continue;

    const module = task.moduleId ? modules.find((entry) => entry.id === task.moduleId) : null;
    const id = `task-${task.id}`;
    items.push({
      id,
      kind: 'task',
      title: task.title,
      subtitle: module ? `${module.code} · Task reminder` : 'Task reminder',
      detail: formatRelativeDue(dueAt, now),
      targetTab: module ? 'academic' : 'personal',
      moduleId: module?.id ?? null,
      dueAt,
      severity: getSeverity(dueAt, now),
      isRead: readNotificationIds.includes(id),
    });
  }

  for (const event of events) {
    const startAt = safeParseDate(event.startTime);
    if (!startAt) continue;

    const leadMinutes = event.reminderMinutes === null || event.reminderMinutes < 0 ? null : Math.max(0, event.reminderMinutes ?? 15);
    if (leadMinutes === null) continue;

    const notifyAt = subMinutes(startAt, leadMinutes);
    const id = `event-${event.id}`;
    const reminderLabel = leadMinutes === 0 ? 'At start' : leadMinutes < 60 ? `${leadMinutes} min before` : `${Math.round(leadMinutes / 60)} h before`;

    items.push({
      id,
      kind: 'event',
      title: event.title,
      subtitle: `Calendar event · ${reminderLabel}`,
      detail: formatWhen(startAt, now),
      targetTab: 'calendar',
      dueAt: notifyAt,
      severity: getSeverity(notifyAt, now),
      isRead: readNotificationIds.includes(id),
    });
  }

  return items.sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
}
