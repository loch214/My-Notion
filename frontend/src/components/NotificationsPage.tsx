import { ArrowRight, Bell, Clock3, CalendarDays, CircleAlert, CheckCheck } from 'lucide-react';
import { WorkspaceNotificationItem } from '../lib/notifications';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface NotificationsPageProps {
  items: WorkspaceNotificationItem[];
  onOpenItem: (item: WorkspaceNotificationItem) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function sectionTitle(severity: WorkspaceNotificationItem['severity']) {
  if (severity === 'overdue') return 'Overdue';
  if (severity === 'today') return 'Today';
  if (severity === 'upcoming') return 'Upcoming';
  return 'Later';
}

function sectionIcon(severity: WorkspaceNotificationItem['severity']) {
  if (severity === 'overdue') return CircleAlert;
  if (severity === 'today') return Clock3;
  if (severity === 'upcoming') return CalendarDays;
  return Bell;
}

export function NotificationsPage({ items, onOpenItem, onMarkRead, onMarkAllRead }: NotificationsPageProps) {
  const unreadCount = items.filter((item) => !item.isRead).length;
  const grouped = ['overdue', 'today', 'upcoming', 'later'] as const;
  const recentItems = items.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Alerts</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">Notifications</h1>
          <p className="max-w-2xl text-sm text-[color:var(--muted)]">Tasks, timetable reminders, and event alerts are grouped here so you can clear them quickly without extra noise.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onMarkAllRead} disabled={unreadCount === 0} leftIcon={<CheckCheck className="h-4 w-4" />}>
          Mark all read
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Unread', value: unreadCount },
          { label: 'Total', value: items.length },
          { label: 'Tasks', value: items.filter((item) => item.kind === 'task').length },
          { label: 'Events', value: items.filter((item) => item.kind === 'event').length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {grouped.map((severity) => {
            const groupItems = items.filter((item) => item.severity === severity);
            if (groupItems.length === 0) return null;
            const Icon = sectionIcon(severity);
            return (
              <section key={severity} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--surface-med)] text-[color:var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text)]">{sectionTitle(severity)}</p>
                      <p className="text-xs text-[color:var(--muted)]">{groupItems.length} reminder{groupItems.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    {severity}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-150 ease',
                        item.isRead
                          ? 'border-[color:var(--border)] bg-[color:var(--surface-med)]/60 opacity-70'
                          : 'border-[color:var(--border-focus)]/20 bg-[color:var(--surface-med)]'
                      )}
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenItem(item)}>
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]', item.kind === 'event' ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]' : 'bg-[color:var(--surface-high)] text-[color:var(--muted)]')}>
                            {item.kind}
                          </span>
                          <span className="text-xs text-[color:var(--muted)]">{item.detail}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                        <p className="mt-0.5 text-sm text-[color:var(--muted)]">{item.subtitle}</p>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => onOpenItem(item)} leftIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                          Open
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.isRead) onMarkRead(item.id);
                          }}
                          disabled={item.isRead}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150 ease',
                            item.isRead
                              ? 'cursor-default border border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--muted)]'
                              : 'border border-[color:var(--border-focus)]/20 bg-[color:var(--accent)]/10 text-[color:var(--accent)] hover:bg-[color:var(--accent)]/15'
                          )}
                        >
                          {item.isRead ? 'Read' : 'Mark read'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Recent reminders</p>
            <h2 className="mt-1 text-sm font-semibold text-[color:var(--text)]">Latest items</h2>
          </div>
          <div className="space-y-2">
            {recentItems.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] p-4 text-sm text-[color:var(--muted)]">No reminders yet.</div>
            ) : (
              recentItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] p-3">
                  <p className="text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                  <p className="text-xs text-[color:var(--muted)]">{item.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
