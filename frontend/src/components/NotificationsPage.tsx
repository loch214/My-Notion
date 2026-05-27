import React, { useMemo } from 'react';
import { Bell, Calendar, CheckCircle2, Clock3, Inbox, ArrowRight, CircleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { WorkspaceNotificationItem } from '../lib/notifications';

import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SectionHeader } from './ui/SectionHeader';

interface NotificationsPageProps {
  items: WorkspaceNotificationItem[];
  onOpenItem: (item: WorkspaceNotificationItem) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function sectionTitle(key: WorkspaceNotificationItem['severity']) {
  if (key === 'overdue') return 'Overdue';
  if (key === 'today') return 'Today';
  if (key === 'upcoming') return 'Coming up';
  return 'Later';
}

function sectionIcon(key: WorkspaceNotificationItem['severity']) {
  if (key === 'overdue') return CircleAlert;
  if (key === 'today') return Bell;
  if (key === 'upcoming') return Clock3;
  return Calendar;
}

export function NotificationsPage({ items, onOpenItem, onMarkRead, onMarkAllRead }: NotificationsPageProps) {
  const unreadCount = items.filter((item) => !item.isRead).length;
  const taskCount = items.filter((item) => item.kind === 'task').length;
  const eventCount = items.filter((item) => item.kind === 'event').length;
  const overdueCount = items.filter((item) => item.severity === 'overdue').length;

  const groupedItems = useMemo(() => {
    return (['overdue', 'today', 'upcoming', 'later'] as const)
      .map((severity) => ({
        severity,
        items: items.filter((item) => item.severity === severity),
      }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <div className="text-[color:var(--text)]">
      <SectionHeader
        title="Notifications"
        subtitle="Tasks and event reminders in one place."
        category="Alerts"
        actions={null}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Unread', value: unreadCount, icon: Inbox },
          { label: 'Tasks', value: taskCount, icon: CheckCircle2 },
          { label: 'Events', value: eventCount, icon: Calendar },
          { label: 'Overdue', value: overdueCount, icon: CircleAlert },
        ].map((stat) => (
          <Card key={stat.label} spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">{stat.label}</p>
              <stat.icon className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <p className="mt-3 text-3xl font-bold font-heading text-[color:var(--text)] sm:text-4xl">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-4 xl:flex-[1.3] xl:basis-0">
          {items.length === 0 ? (
            <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
              <div className="py-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-[color:var(--muted)]" />
                <p className="mt-4 text-lg font-semibold text-[color:var(--text)]">No reminders yet</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">Add a task due date or an event reminder.</p>
              </div>
            </Card>
          ) : (
            <div className="max-h-[35rem] space-y-4 overflow-y-auto pr-1 no-scrollbar">
              {groupedItems.map((group) => {
                const Icon = sectionIcon(group.severity);
                return (
                  <Card key={group.severity} spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4.5 w-4.5 text-[color:var(--accent)]" />
                      <h2 className="text-base font-bold font-heading text-[color:var(--text)]">{sectionTitle(group.severity)}</h2>
                    </div>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      {group.items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-150 ease',
                          item.isRead
                            ? 'border-[color:var(--border)] bg-[color:var(--surface-med)]/60 opacity-70'
                            : 'border-[color:var(--border-focus)]/20 bg-[color:var(--surface-med)]'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenItem(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]',
                              item.kind === 'event'
                                ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
                                : 'bg-[color:var(--surface-high)] text-[color:var(--muted)]'
                            )}>
                              {item.kind}
                            </span>
                            <span className="text-xs text-[color:var(--muted)]">{item.detail}</span>
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                          <p className="mt-0.5 text-sm text-[color:var(--muted)]">{item.subtitle}</p>
                        </button>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenItem(item)}
                            className="h-8 px-3"
                            leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                          >
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
                  </Card>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex justify-end pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="h-8 px-3 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 min-w-0 xl:flex-[0.9] xl:basis-0">
          <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)]">
            <div className="flex items-center gap-2">
              <Inbox className="h-4.5 w-4.5 text-[color:var(--accent)]" />
              <h2 className="text-base font-bold font-heading text-[color:var(--text)]">Recent reminders</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[color:var(--muted)]">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 py-2">
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {format(item.dueAt, 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
