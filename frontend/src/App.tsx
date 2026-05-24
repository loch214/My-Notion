import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Bell,
  Home,
  Library,
  LayoutDashboard,
  Search,
  Sparkles,
  Settings2,
  X,
} from 'lucide-react';
import { useAppStore } from './store';
import { GlobalChat } from './components/GlobalChat.tsx';
import { AcademicOverview } from './components/AcademicOverview.tsx';
import { ModuleDetail } from './components/ModuleDetail.tsx';
import { PersonalDashboard } from './components/PersonalDashboard.tsx';
import CalendarView from './components/CalendarView';
import { cn } from './lib/utils';

type WorkspaceTab = 'home' | 'academic' | 'personal' | 'calendar';
type SearchResultKind = 'tab' | 'module' | 'task' | 'event';

interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  keywords: string[];
  actionLabel: string;
  moduleId?: string;
  tab: WorkspaceTab;
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: any }) {
  return (
    <div className="surface rounded-2xl p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        <div className="rounded-2xl surface-soft p-3 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, updateState, toggleTask, addModule, addTask, removeTask, updateTask, updateModule, saveGlobalChatMessage, addEvent, removeEvent, updateEvent } = useAppStore();
  
  const [appStage, setAppStage] = useState<'landing' | 'workspace'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('stage') as any) || 'landing';
  });
  const [activeTab, setActiveTab] = useState<'home' | 'academic' | 'personal' | 'calendar'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as any) || 'home';
  });
  const [activeModuleId, setActiveModuleId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('module');
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  // Sync state with URL for back button support
  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      setAppStage((p.get('stage') as any) || 'landing');
      setActiveTab((p.get('tab') as any) || 'home');
      setActiveModuleId(p.get('module') || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (appStage !== 'landing') params.set('stage', appStage);
    if (activeTab !== 'home') params.set('tab', activeTab);
    if (activeModuleId) params.set('module', activeModuleId);

    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    if (window.location.search !== '?' + params.toString() && window.location.search !== '' || params.toString() !== '') {
        // Only push if different to avoid infinite loops or redundant entries
        const currentParams = new URLSearchParams(window.location.search).toString();
        if (currentParams !== params.toString()) {
            window.history.pushState(null, '', newRelativePathQuery);
        }
    }
  }, [appStage, activeTab, activeModuleId]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const activeModule = useMemo(
    () => state.modules.find((module) => module.id === activeModuleId) ?? null,
    [state.modules, activeModuleId]
  );

  const openWorkspaceTab = (tab: WorkspaceTab, moduleId: string | null = null) => {
    setAppStage('workspace');
    setActiveTab(tab);
    setActiveModuleId(moduleId);
    setIsMobileSidebarOpen(false);
  };

  const navigateToTab = (tab: WorkspaceTab) => {
    openWorkspaceTab(tab);
  };

  const upcomingNotifications = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueTasks = state.tasks
      .filter((task) => !task.done && task.dueDate)
      .map((task) => ({ task, dueDate: new Date(task.dueDate as string), module: task.moduleId ? state.modules.find((entry) => entry.id === task.moduleId) : null }))
      .filter(({ dueDate }) => !Number.isNaN(dueDate.getTime()) && dueDate >= now && dueDate <= sevenDaysFromNow)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
      .slice(0, 4)
      .map(({ task, dueDate, module }) => ({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `Due ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        action: () => openWorkspaceTab(module ? 'academic' : 'personal', module ? module.id : null),
      }));

    const upcomingEvents = state.events
      .map((event) => ({ event, startDate: new Date(event.startTime) }))
      .filter(({ startDate }) => !Number.isNaN(startDate.getTime()) && startDate >= now && startDate <= sevenDaysFromNow)
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
      .slice(0, 4)
      .map(({ event, startDate }) => ({
        id: `event-${event.id}`,
        title: event.title,
        subtitle: `Starts ${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        action: () => openWorkspaceTab('calendar'),
      }));

    return [...dueTasks, ...upcomingEvents].slice(0, 5);
  }, [state.events, state.tasks]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    const quickNav: SearchResult[] = [
      {
        id: 'tab-home',
        kind: 'tab',
        title: 'Home',
        subtitle: 'Workspace overview',
        keywords: ['home', 'overview', 'dashboard', 'workspace'],
        actionLabel: 'Open page',
        tab: 'home',
      },
      {
        id: 'tab-academic',
        kind: 'tab',
        title: 'Academic',
        subtitle: 'Modules, notes, and study tasks',
        keywords: ['academic', 'modules', 'study', 'classes'],
        actionLabel: 'Open page',
        tab: 'academic',
      },
      {
        id: 'tab-personal',
        kind: 'tab',
        title: 'Personal',
        subtitle: 'Personal tasks and priorities',
        keywords: ['personal', 'tasks', 'todo', 'priority'],
        actionLabel: 'Open page',
        tab: 'personal',
      },
      {
        id: 'tab-calendar',
        kind: 'tab',
        title: 'Calendar',
        subtitle: 'Events and schedule',
        keywords: ['calendar', 'events', 'schedule', 'meetings'],
        actionLabel: 'Open page',
        tab: 'calendar',
      },
    ];

    const moduleResults: SearchResult[] = state.modules.map((module) => ({
      id: `module-${module.id}`,
      kind: 'module',
      title: module.title,
      subtitle: module.code,
      keywords: [module.title, module.code, 'module', 'modules', ...module.files.map((file) => file.name)],
      actionLabel: 'Open module',
      moduleId: module.id,
      tab: 'academic',
    }));

    const taskResults: SearchResult[] = state.tasks.map((task) => {
      const module = task.moduleId ? state.modules.find((entry) => entry.id === task.moduleId) : null;
      return {
        id: `task-${task.id}`,
        kind: 'task',
        title: task.title,
        subtitle: [task.done ? 'Completed' : 'Open task', task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null, module ? module.code : null]
          .filter(Boolean)
          .join(' • '),
        keywords: [task.title, 'task', 'tasks', module?.title, module?.code].filter(Boolean) as string[],
        actionLabel: 'Open tasks',
        tab: module ? 'academic' : 'personal',
        moduleId: module ? module.id : undefined,
      };
    });

    const eventResults: SearchResult[] = state.events.map((event) => ({
      id: `event-${event.id}`,
      kind: 'event',
      title: event.title,
      subtitle: `${new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • Calendar`,
      keywords: [event.title, event.description, 'event', 'events', 'calendar', 'schedule'].filter(Boolean) as string[],
      actionLabel: 'Open calendar',
      tab: 'calendar',
    }));

    const allResults = query
      ? [...moduleResults, ...taskResults, ...eventResults, ...quickNav]
          .map((result) => {
            const haystack = [result.title, result.subtitle, ...result.keywords].join(' ').toLowerCase();
            let score = 0;
            if (haystack === query) score = 0;
            else if (result.title.toLowerCase().startsWith(query) || result.subtitle.toLowerCase().startsWith(query)) score = 1;
            else if (haystack.includes(query)) score = 2;
            else return null;
            return { ...result, score };
          })
          .filter(Boolean)
          .sort((left, right) => (left!.score - right!.score) || left!.title.localeCompare(right!.title))
          .slice(0, 8)
          .map(({ score, ...result }) => result)
      : quickNav;

    return allResults;
  }, [searchQuery, state.events, state.modules, state.tasks]);

  const runSearchResult = (result: SearchResult) => {
    openWorkspaceTab(result.tab, result.moduleId ?? null);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItemClass = (isActive: boolean) => cn(
    'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200',
    isActive
      ? 'surface-soft text-[color:var(--text)] font-medium shadow-sm'
      : 'text-muted hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]'
  );

  if (appStage === 'landing') {
    return (
      <div className="app-shell relative overflow-hidden text-[color:var(--text)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[color:var(--accent)]/12 blur-3xl animate-drift" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[color:var(--accent-2)]/10 blur-3xl animate-drift" />
          <div className="hero-bottom-fade absolute inset-x-0 bottom-0 h-56" />
        </div>

        <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
          <main className="flex w-full max-w-2xl flex-col items-center text-center animate-fade-up">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent text-[color:var(--on-accent)] shadow-xl shadow-black/20">
              <Sparkles className="h-10 w-10" />
            </div>
            
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
              My-Notion
            </h1>
            
            <p className="mt-6 text-lg text-muted sm:text-xl">
              Manage your academic modules, tasks, and calendar.
            </p>

            <div className="mt-10">
              <button
                onClick={() => setAppStage('workspace')}
                className="btn-primary px-8 py-3 text-base font-semibold"
              >
                Enter workspace
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell relative flex min-h-screen overflow-x-hidden">
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-2 top-[72px] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[rgba(12,18,34,0.82)] text-[color:var(--text)] shadow-lg shadow-black/25 transition hover:bg-[rgba(12,18,34,0.95)] md:hidden"
        aria-label="Open sidebar"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-2 top-[72px] z-50 hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[rgba(12,18,34,0.82)] text-[color:var(--text)] shadow-lg shadow-black/25 transition hover:bg-[rgba(12,18,34,0.95)] md:flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        aria-label="Close sidebar"
        onClick={() => setIsMobileSidebarOpen(false)}
        className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden', isMobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />

      <aside className={cn('fixed left-0 top-[72px] z-40 flex h-[calc(100vh-72px)] w-[240px] -translate-x-full flex-col overflow-hidden border-r border-subtle bg-[color:var(--app-bg)] px-4 py-4 shadow-2xl shadow-black/20 transition-all duration-300 md:shadow-none', isSidebarOpen ? 'md:translate-x-0 md:w-[240px]' : 'md:-translate-x-full md:w-[240px]', isMobileSidebarOpen ? 'translate-x-0' : '')}>
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-[color:var(--on-accent)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Workspace</p>
              <h2 className="truncate text-base font-semibold">Loch's Notion</h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="hidden rounded-full p-2 text-muted transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)] md:inline-flex"
              aria-label={isSidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', isSidebarOpen ? 'rotate-180' : '')} />
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="rounded-full p-2 text-muted transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)] md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 pt-2">
          <button onClick={() => navigateToTab('home')} className={navItemClass(activeTab === 'home')}>
            <Home className="h-4 w-4 shrink-0" />
            <span>Home</span>
          </button>
          <button onClick={() => navigateToTab('academic')} className={navItemClass(activeTab === 'academic' && !activeModuleId)}>
            <Library className="h-4 w-4 shrink-0" />
            <span>Academic</span>
          </button>
          <button onClick={() => navigateToTab('personal')} className={navItemClass(activeTab === 'personal')}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Personal</span>
          </button>
          <button onClick={() => navigateToTab('calendar')} className={navItemClass(activeTab === 'calendar')}>
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Calendar</span>
          </button>
        </nav>

        <div className="pt-4">
          <div className="rounded-2xl border border-subtle px-3 py-2 text-center text-xs text-muted">My-Notion v1.0</div>
        </div>
      </aside>

      <div className={cn('min-w-0 flex-1 transition-[padding-left] duration-300', isSidebarOpen ? 'md:pl-[240px]' : 'md:pl-0')}>
        <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
          <header className="mx-auto flex h-14 max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-[1.75rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(12,18,34,0.60)] px-3 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:max-w-[calc(100vw-2rem)] sm:px-4 lg:max-w-[calc(100vw-3rem)] lg:px-5">
              <button
                type="button"
                onClick={() => setAppStage('landing')}
                className="flex items-center gap-2.5 rounded-full px-2 py-1.5 text-left transition hover:bg-white/5"
                aria-label="Go to landing page"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[color:var(--on-accent)] shadow-lg shadow-black/20">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold text-[color:var(--text)]">Loch's Notion</span>
                </span>
              </button>
            </div>

            <div ref={searchRef} className="relative mx-auto min-w-0 w-full max-w-[28rem]">
              <div className="relative flex h-10 items-center rounded-full border border-white/10 bg-[rgba(12,18,34,0.52)] pl-4 pr-12 transition focus-within:border-[color:rgba(99,102,241,0.45)] focus-within:shadow-[0_0_0_2px_rgba(99,102,241,0.10)]">
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) {
                      runSearchResult(searchResults[0]);
                    }
                  }}
                  placeholder="Search modules, tasks, events, or pages..."
                  className="h-full w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim() && searchResults[0]) {
                      runSearchResult(searchResults[0]);
                      return;
                    }
                    setIsSearchOpen(true);
                  }}
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(17,24,39,0.96)] text-[color:var(--text)] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:brightness-110"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {isSearchOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-40 overflow-hidden rounded-[1.5rem] border border-subtle surface-strong shadow-2xl shadow-black/25">
                  <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Search</p>
                      <p className="mt-1 text-sm text-[color:var(--text)]">Jump to any page, module, task, or event</p>
                    </div>
                    <p className="text-xs text-muted">{searchResults.length} results</p>
                  </div>
                  <div className="max-h-[22rem] overflow-y-auto p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => runSearchResult(result)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-[color:var(--surface-soft)]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[color:var(--text)]">{result.title}</span>
                              <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">{result.kind}</span>
                            </div>
                            <p className="mt-1 truncate text-sm text-muted">{result.subtitle}</p>
                          </div>
                          <span className="shrink-0 text-xs text-accent">{result.actionLabel}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-10 text-center text-sm text-muted">
                        No matches found. Try a module code, task title, or calendar event.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((current) => !current);
                    setIsSearchOpen(false);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[color:var(--text)] transition hover:bg-white/10"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {upcomingNotifications.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[10px] font-semibold text-[color:var(--on-accent)]">
                      {upcomingNotifications.length > 9 ? '9+' : upcomingNotifications.length}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.6rem)] z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-subtle surface-strong shadow-2xl shadow-black/25">
                    <div className="border-b border-subtle px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Notifications</p>
                      <p className="mt-1 text-sm text-[color:var(--text)]">Upcoming tasks and events</p>
                    </div>
                    <div className="max-h-[22rem] overflow-y-auto p-2">
                      {upcomingNotifications.length > 0 ? (
                        upcomingNotifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.action();
                              setIsNotificationsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-[color:var(--surface-soft)]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[color:var(--text)]">{item.title}</p>
                              <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-10 text-center text-sm text-muted">
                          No upcoming notifications.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAiPanelOpen(true)}
                className="btn-primary h-9 px-4 text-xs font-semibold sm:px-5"
              >
                <Sparkles className="h-4 w-4" />
                Say Hello
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[color:var(--text)] transition hover:bg-white/10"
                aria-label="Settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </header>
        </div>

        <main className="overflow-x-hidden px-4 pb-4 pt-[72px] sm:px-6 sm:pb-6 lg:px-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            {activeTab === 'home' && (
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="surface-strong hero-ring rounded-[1.75rem] p-4 sm:p-5 animate-fade-up">
                  <div className="inline-flex items-center gap-2 rounded-full border border-subtle surface-soft px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Today inside My-Notion
                  </div>
                  <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                    Welcome to your personal workspace.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                    Overview of your academics, personal tasks, and upcoming events. Keep everything organized and accessible in one place.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigateToTab('academic')}
                      className="btn-primary px-5 py-2.5 text-sm font-semibold"
                    >
                      Open academics <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigateToTab('personal')}
                      className="btn-primary px-5 py-2.5 text-sm font-semibold"
                    >
                      Open personal <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsAiPanelOpen(true)}
                      className="btn-primary px-5 py-2.5 text-sm font-semibold"
                    >
                      <Sparkles className="h-4 w-4" /> Ask AI
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="surface rounded-[1.75rem] p-4 animate-fade-up">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-muted">Workspace summary</p>
                        <h2 className="mt-2 text-xl font-semibold">Quick context</h2>
                      </div>
                      <div className="rounded-2xl surface-soft p-3 text-accent">
                        <Library className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-muted">
                      <div className="flex items-center justify-between rounded-2xl surface-soft px-4 py-3">
                        <span>Academic modules</span>
                        <span className="font-semibold text-[color:var(--text)]">{state.modules.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl surface-soft px-4 py-3">
                        <span>Personal tasks</span>
                        <span className="font-semibold text-[color:var(--text)]">{state.tasks.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl surface-soft px-4 py-3">
                        <span>Calendar events</span>
                        <span className="font-semibold text-[color:var(--text)]">{state.events.length}</span>
                      </div>
                    </div>
                  </div>

                    <div className="surface rounded-[1.75rem] p-4 animate-fade-up">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Entry points</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <button onClick={() => navigateToTab('academic')} className="surface-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:text-[color:var(--text)]">
                        <span>Academic dashboard</span>
                        <ArrowRight className="h-4 w-4 text-accent" />
                      </button>
                      <button onClick={() => navigateToTab('personal')} className="surface-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:text-[color:var(--text)]">
                        <span>Personal dashboard</span>
                        <ArrowRight className="h-4 w-4 text-accent" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'academic' && !activeModuleId && (
              <div className="surface-strong rounded-[1.75rem] p-4 sm:p-5 animate-fade-up">
                <AcademicOverview
                  modules={state.modules}
                  tasks={state.tasks}
                  onOpenModule={setActiveModuleId}
                  onAddModule={addModule}
                  onToggleTask={toggleTask}
                  onAddTask={addTask}
                  onEditTask={updateTask}
                  onRemoveTask={removeTask}
                />
              </div>
            )}

            {activeTab === 'academic' && activeModuleId && activeModule && (
              <div className="surface-strong rounded-[1.75rem] p-4 sm:p-5 animate-fade-up">
                <ModuleDetail
                  module={activeModule}
                  tasks={state.tasks.filter(t => t.moduleId === activeModule.id)}
                  onToggleTask={toggleTask}
                  onAddTask={(title, dueDate) => addTask(title, dueDate, activeModule.id)}
                  onEditTask={(id, updates) => updateTask(id, updates)}
                  onRemoveTask={(id) => removeTask(id)}
                  onBack={() => setActiveModuleId(null)}
                  updateModule={updateModule}
                />
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="surface-strong rounded-[1.75rem] p-4 sm:p-5 animate-fade-up">
                <PersonalDashboard
                  tasks={state.tasks}
                  events={state.events}
                  onToggleTask={toggleTask}
                  onAddTask={addTask}
                  onEditTask={updateTask}
                  onRemoveTask={removeTask}
                />
              </div>
            )}
            {activeTab === 'calendar' && (
              <div className="surface-strong rounded-[1.75rem] p-4 sm:p-5 animate-fade-up">
                <CalendarView events={state.events} onAddEvent={addEvent} onRemoveEvent={removeEvent} onUpdateEvent={updateEvent} />
              </div>
            )}
          </div>
        </main>
      </div>

      {isAiPanelOpen && (
        <GlobalChat
          onClose={() => setIsAiPanelOpen(false)}
          state={state}
          saveGlobalChatMessage={saveGlobalChatMessage}
        />
      )}
    </div>
  );
}
