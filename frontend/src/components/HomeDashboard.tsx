import { useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  FileText,
  History,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import { AppState } from '../types';
import { AI_MODELS } from '../lib/models';
import { RecentPage } from '../lib/recentPage';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';

interface HomeDashboardProps {
  state: AppState;
  recentPage: RecentPage | null;
  onExploreAcademic: () => void;
  onViewPersonal: () => void;
  onAskAi: () => void;
  onOpenRecent?: () => void;
  className?: string;
}

export function HomeDashboard({
  state,
  recentPage,
  onExploreAcademic,
  onViewPersonal,
  onAskAi,
  onOpenRecent,
  className,
}: HomeDashboardProps) {
  const documentCount = useMemo(
    () => state.modules.reduce((sum, module) => sum + module.files.length, 0),
    [state.modules]
  );
  const isEmptyWorkspace = state.modules.length === 0 && state.tasks.length === 0 && state.events.length === 0;

  const upcomingEventCount = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return state.events.filter((event) => {
      const start = new Date(event.startTime).getTime();
      return !Number.isNaN(start) && start >= now && start <= week;
    }).length;
  }, [state.events]);

  const stats = [
    {
      label: 'Academic modules',
      value: state.modules.length,
      icon: BookOpen,
    },
    {
      label: 'Documents uploaded',
      value: documentCount,
      icon: FileText,
    },
    {
      label: 'Upcoming events',
      value: upcomingEventCount,
      icon: Calendar,
    },
    {
      label: 'Open tasks',
      value: state.tasks.filter((t) => !t.done).length,
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Workspace overview</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-[color:var(--text)]">
            Home
          </h1>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} spotlight={true} className="card-pad bg-[color:var(--surface-low)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    {stat.label}
                  </p>
                  <Icon className="h-5 w-5 shrink-0 text-[color:var(--accent)]" />
                </div>
                <p className="mt-3 font-heading text-3xl font-bold text-[color:var(--text)] sm:text-4xl">
                  {stat.value}
                </p>
              </Card>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenRecent}
          disabled={!recentPage || !onOpenRecent}
          className={cn(
            'card-pad flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] text-left transition-all duration-150 ease',
            recentPage && onOpenRecent
              ? 'hover:border-[color:var(--border-focus)] hover:bg-[color:var(--surface-med)]/40'
              : 'cursor-default opacity-90'
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-med)] text-[color:var(--accent)]">
              <History className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[color:var(--muted)]">Recently visited</p>
              <p className="truncate text-lg font-semibold text-[color:var(--text)]">
                {recentPage?.label ?? 'Nothing opened yet'}
              </p>
              {!recentPage && (
                <p className="mt-1 text-sm text-[color:var(--muted)]">Open any workspace area and it will appear here.</p>
              )}
            </div>
          </div>
          {recentPage && onOpenRecent && (
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--muted)]" />
          )}
        </button>

        <div className="flex flex-wrap gap-4">
          <Button variant="primary" size="md" onClick={onExploreAcademic} className="min-w-[10rem]">
            Explore Academics
          </Button>
          <Button variant="secondary" size="md" onClick={onViewPersonal} className="min-w-[10rem]">
            View Personal
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onAskAi}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="min-w-[10rem]"
          >
            Ask AI Assistant
          </Button>
        </div>

        <div className="card-pad rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            System status
          </p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            All services online
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {AI_MODELS.map((model) => (
              <span
                key={model.id}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)]/50 px-3 py-1.5 text-sm text-[color:var(--text)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {model.label}
                <span className="text-xs text-[color:var(--muted)]">{model.badge}</span>
              </span>
            ))}
          </div>
        </div>

        {isEmptyWorkspace && (
          <Card spotlight={false} className="card-pad bg-[color:var(--surface-low)] border-dashed">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Get started</p>
                <h2 className="mt-1 text-xl font-bold font-heading text-[color:var(--text)]">Your workspace is empty</h2>
                <p className="mt-1 max-w-2xl text-sm text-[color:var(--muted)]">
                  Add a module, create a task, or ask the AI assistant a question to populate the workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={onExploreAcademic}>
                  Start with academics
                </Button>
                <Button variant="secondary" size="sm" onClick={onViewPersonal}>
                  Create a task
                </Button>
                <Button variant="secondary" size="sm" onClick={onAskAi} leftIcon={<Sparkles className="h-4 w-4" />}>
                  Ask AI
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
