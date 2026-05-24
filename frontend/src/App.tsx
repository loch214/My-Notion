import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Bell,
  Home,
  Library,
  LayoutDashboard,
  Search,
  Sparkles,
  Settings2,
  X,
  Menu,
  Clock,
  CheckCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from './store';
import { GlobalChat } from './components/GlobalChat.tsx';
import { AcademicOverview } from './components/AcademicOverview.tsx';
import { ModuleDetail } from './components/ModuleDetail.tsx';
import { PersonalDashboard } from './components/PersonalDashboard.tsx';
import CalendarView from './components/CalendarView';
import { cn } from './lib/utils';

// Import UI primitives
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Input } from './components/ui/Input';
import { PageContainer } from './components/ui/PageContainer';
import { SectionHeader } from './components/ui/SectionHeader';

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

export default function App() {
  const { 
    state, 
    addModule, 
    addTask, 
    removeTask, 
    updateTask, 
    updateModule, 
    saveGlobalChatMessage, 
    addEvent, 
    removeEvent, 
    updateEvent,
    toggleTask
  } = useAppStore();
  
  // Persistence state from localStorage
  const [appStage, setAppStage] = useState<'landing' | 'workspace'>(() => {
    const params = new URLSearchParams(window.location.search);
    const stage = params.get('stage');
    if (stage === 'landing' || stage === 'workspace') return stage;
    return (localStorage.getItem('my_notion_stage') as any) || 'landing';
  });

  const [activeTab, setActiveTab] = useState<'home' | 'academic' | 'personal' | 'calendar'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) return tab as any;
    return (localStorage.getItem('my_notion_tab') as any) || 'home';
  });

  const [activeModuleId, setActiveModuleId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const module = params.get('module');
    if (module) return module;
    return localStorage.getItem('my_notion_active_module') || null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('my_notion_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Save UI Preferences inside localStorage
  useEffect(() => {
    localStorage.setItem('my_notion_stage', appStage);
  }, [appStage]);

  useEffect(() => {
    localStorage.setItem('my_notion_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeModuleId) {
      localStorage.setItem('my_notion_active_module', activeModuleId);
    } else {
      localStorage.removeItem('my_notion_active_module');
    }
  }, [activeModuleId]);

  useEffect(() => {
    localStorage.setItem('my_notion_sidebar_open', String(isSidebarOpen));
  }, [isSidebarOpen]);

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
    if (window.location.search !== '?' + params.toString()) {
      const currentParams = new URLSearchParams(window.location.search).toString();
      if (currentParams !== params.toString()) {
        window.history.pushState(null, '', newRelativePathQuery);
      }
    }
  }, [appStage, activeTab, activeModuleId]);

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

  // Sync window breadcrumb tag
  const activeBreadcrumb = useMemo(() => {
    if (activeTab === 'home') return 'Home';
    if (activeTab === 'academic') {
      return activeModule ? `Academic / ${activeModule.code}` : 'Academic Space';
    }
    if (activeTab === 'personal') return 'Personal Focus';
    if (activeTab === 'calendar') return 'Schedule';
    return 'Dashboard';
  }, [activeTab, activeModule]);

  if (appStage === 'landing') {
    return (
      <div className="relative min-h-screen bg-[color:var(--app-bg)] flex flex-col justify-between overflow-x-hidden pt-12 pb-8 px-4 sm:px-6">
        {/* Futuristic isolated cinematic overlay background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-45 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        {/* Landing Top Navbar */}
        <header className="relative max-w-5xl w-full mx-auto flex items-center justify-between shrink-0 mb-12">
          <div className="flex items-center gap-2.5 font-semibold text-lg text-[color:var(--text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)] shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="font-heading tracking-tight font-bold">My-Notion</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setAppStage('workspace')}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Launch app
          </Button>
        </header>

        {/* Hero details container */}
        <main className="relative max-w-5xl w-full mx-auto flex flex-col items-center flex-1 justify-center py-6 text-center z-10">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-low)] px-3.5 py-1.5 text-xs text-[color:var(--muted)] font-medium mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Designed exclusively for university students
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl font-heading text-gradient max-w-3xl leading-[1.1]"
          >
            The premium student study workspace.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-base text-[color:var(--muted)] sm:text-lg max-w-xl leading-relaxed"
          >
            Keep your class notes, lectures, task lists, calendar agendas, and RAG-powered AI study rooms perfectly sync'd under one clean, human-designed interface.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3 shrink-0"
          >
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => setAppStage('workspace')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Enter workspace
            </Button>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors underline underline-offset-4 px-2 py-1.5"
            >
              Learn how it works
            </a>
          </motion.div>

          {/* Cinematic Interactive Dashboard Layout Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 22, delay: 0.4 }}
            className="relative mt-16 w-full max-w-4xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] p-2 shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--app-bg)] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-xl bg-[color:var(--surface-med)] border border-[color:var(--border)] overflow-hidden aspect-[16/9] text-left p-4 sm:p-6 flex flex-col justify-between">
              {/* Miniature Layout Navbar mock */}
              <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[10px] text-[color:var(--muted)] ml-2 font-mono">my-notion.workspace / home</span>
                </div>
                <div className="h-5 w-40 rounded-lg bg-[color:var(--surface-low)] border border-[color:var(--border)]" />
              </div>
              
              {/* Main dashboard mock panels */}
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div className="col-span-2 border border-[color:var(--border)] rounded-xl bg-[color:var(--surface-low)] p-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="h-3 w-24 bg-[color:var(--surface-high)] rounded" />
                    <div className="h-2.5 w-44 bg-[color:var(--muted)]/20 rounded mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="h-12 border border-[color:var(--border)] rounded-lg p-2 flex flex-col justify-between">
                      <div className="h-2 w-10 bg-[color:var(--muted)]/30 rounded" />
                      <div className="h-3.5 w-6 bg-[color:var(--accent)] rounded" />
                    </div>
                    <div className="h-12 border border-[color:var(--border)] rounded-lg p-2 flex flex-col justify-between">
                      <div className="h-2 w-12 bg-[color:var(--muted)]/30 rounded" />
                      <div className="h-3.5 w-6 bg-[color:var(--accent-2)] rounded" />
                    </div>
                  </div>
                </div>
                <div className="border border-[color:var(--border)] rounded-xl bg-[color:var(--surface-low)] p-3 flex flex-col gap-2">
                  <div className="h-3 w-16 bg-[color:var(--surface-high)] rounded" />
                  <div className="h-8 border border-[color:var(--border)] rounded-lg flex items-center justify-between px-2">
                    <div className="h-2 w-16 bg-[color:var(--muted)]/30 rounded" />
                    <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  </div>
                  <div className="h-8 border border-[color:var(--border)] rounded-lg flex items-center justify-between px-2">
                    <div className="h-2 w-20 bg-[color:var(--muted)]/30 rounded" />
                    <span className="h-2 w-2 rounded-full bg-[color:var(--accent-2)]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Landing footer */}
        <footer className="relative max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between shrink-0 mt-12 pt-6 border-t border-[color:var(--border)] text-xs text-[color:var(--muted)] z-10 gap-3">
          <p>© 2026 My-Notion. Built for productivity and focus.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-[color:var(--text)] transition-colors cursor-pointer">Security</span>
            <span className="hover:text-[color:var(--text)] transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-[color:var(--text)] transition-colors cursor-pointer">Privacy</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell relative min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text)] flex flex-col select-none">
      
      {/* 1. Raycast Style Navbar */}
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-3 shrink-0">
        <header className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-4 rounded-full border border-white/10 bg-[color:var(--surface-low)]/85 px-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur-md">
          {/* Left: Logo & Breadcrumbs */}
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)] md:hidden focus:outline-none"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={() => setAppStage('landing')}
              className="flex items-center gap-2.5 rounded-full px-2 py-1 text-left transition hover:bg-white/5"
              aria-label="Go to landing page"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--text)]">
                <span className="font-heading">My-Notion</span>
                <span className="text-[color:var(--border)]">/</span>
                <span className="text-[color:var(--muted)] font-normal text-[11px] font-sans truncate max-w-[120px]">
                  {activeBreadcrumb}
                </span>
              </span>
            </button>
          </div>

          {/* Center: Search input */}
          <div ref={searchRef} className="relative flex-1 max-w-[28rem] min-w-0">
            <div className="relative flex h-9 items-center rounded-full border border-white/10 bg-[color:var(--surface-med)]/40 pl-3.5 pr-10 transition-colors focus-within:border-[color:var(--border-focus)] focus-within:bg-[color:var(--surface-med)]/75">
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
                placeholder="Search anything..."
                className="h-full w-full border-0 bg-transparent p-0 text-xs text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
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
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-high)] text-[color:var(--muted)] shadow-sm transition hover:text-[color:var(--text)]"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>

            <AnimatePresence>
              {isSearchOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)] shadow-2xl shadow-black/40"
                >
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-2.5 bg-[color:var(--surface-med)]/50">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Search results</p>
                    </div>
                    <p className="text-[10px] text-[color:var(--muted)]">{searchResults.length} matches</p>
                  </div>
                  <div className="max-h-[20rem] overflow-y-auto p-1.5 space-y-0.5">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => runSearchResult(result)}
                          className="flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-[color:var(--surface-low)]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[color:var(--text)]">{result.title}</span>
                              <span className="rounded-full border border-[color:var(--border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[color:var(--muted)]">{result.kind}</span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-[color:var(--muted)]">{result.subtitle}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-[color:var(--accent)]">{result.actionLabel}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-xs text-[color:var(--muted)]">
                        No matches found.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Notifications & Say Hello & Settings */}
          <div className="flex shrink-0 items-center gap-2">
            
            {/* Notification triggers */}
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen((current) => !current);
                  setIsSearchOpen(false);
                }}
                className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/5 bg-[color:var(--surface-med)]/40 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-med)]/85 hover:text-[color:var(--text)]"
                aria-label="Notifications widget"
              >
                <Bell className="h-4 w-4" />
                {upcomingNotifications.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[9px] font-bold text-[color:var(--on-accent)] ring-2 ring-[color:var(--surface-low)]">
                    {upcomingNotifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[20rem] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)] shadow-2xl shadow-black/40"
                  >
                    <div className="border-b border-[color:var(--border)] px-4 py-2.5 bg-[color:var(--surface-med)]/50">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Notifications</p>
                      <p className="mt-0.5 text-xs text-[color:var(--text)]">Upcoming schedules</p>
                    </div>
                    <div className="max-h-[20rem] overflow-y-auto p-1.5 space-y-0.5">
                      {upcomingNotifications.length > 0 ? (
                        upcomingNotifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.action();
                              setIsNotificationsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-[color:var(--surface-low)]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[color:var(--text)]">{item.title}</p>
                              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">{item.subtitle}</p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-xs text-[color:var(--muted)]">
                          No upcoming tasks or events.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI global trigger */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAiPanelOpen(true)}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              className="h-8.5 text-xs"
            >
              Say Hello
            </Button>

            {/* Profile trigger placeholder */}
            <button
              type="button"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/5 bg-[color:var(--surface-med)]/40 text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
              aria-label="Settings panel placeholder"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      {/* Main Grid Wrapper (Contains Sidebar + Page Panel) */}
      <div className="flex-1 flex pt-[72px] min-h-0 relative">
        
        {/* 2. Responsive sidebar drawer overlays (Mobile only) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Mobile overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
              />
              {/* Mobile Slide-in Drawer */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="fixed left-0 top-0 bottom-0 z-40 w-[240px] border-r border-[color:var(--border)] bg-[color:var(--surface-low)] p-4 flex flex-col justify-between shadow-2xl md:hidden"
              >
                <div className="flex flex-col gap-6">
                  {/* Top logo */}
                  <div className="flex items-center justify-between pb-3 border-b border-[color:var(--border)]">
                    <span className="font-heading tracking-tight font-bold text-[color:var(--text)]">Loch's Workspace</span>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="rounded-full p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)] transition-colors"
                      aria-label="Close sidebar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Nav List */}
                  <nav className="flex flex-col gap-1">
                    {[
                      { id: 'home', label: 'Home', icon: Home },
                      { id: 'academic', label: 'Academic', icon: Library },
                      { id: 'personal', label: 'Personal', icon: LayoutDashboard },
                      { id: 'calendar', label: 'Calendar', icon: Calendar },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            navigateToTab(tab.id as any);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors text-left w-full',
                            isActive
                              ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] font-semibold shadow-sm'
                              : 'text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
                {/* Footer My Notion v1 */}
                <div className="text-[10px] text-[color:var(--muted)] opacity-60 text-center py-2">
                  My-Notion v1.0
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Collapsible Sidebar (Tablet collapsable to icons, Desktop full size) */}
        <aside 
          className={cn(
            'hidden md:flex flex-col border-r border-[color:var(--border)] bg-[color:var(--surface-low)] py-4 transition-all duration-300 relative shrink-0',
            isSidebarOpen ? 'w-[240px] px-4' : 'w-[72px] px-3'
          )}
        >
          <div className="flex flex-col flex-1 justify-between">
            <div className="space-y-4">
              {/* Sidebar toggle buttons */}
              <div className={cn('flex items-center justify-between pb-3 border-b border-[color:var(--border)]', isSidebarOpen ? '' : 'justify-center')}>
                {isSidebarOpen && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)] font-heading">
                    Workspace
                  </span>
                )}
                <button
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)] transition-colors focus:outline-none"
                  aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', !isSidebarOpen ? 'rotate-180' : '')} />
                </button>
              </div>

              {/* Sidebar Nav Links */}
              <nav className="space-y-1">
                {[
                  { id: 'home', label: 'Home', icon: Home },
                  { id: 'academic', label: 'Academic', icon: Library },
                  { id: 'personal', label: 'Personal', icon: LayoutDashboard },
                  { id: 'calendar', label: 'Calendar', icon: Calendar },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigateToTab(tab.id as any)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl py-2.5 transition-colors text-left w-full relative',
                        isSidebarOpen ? 'px-3 text-xs font-medium' : 'justify-center px-0 text-sm',
                        isActive
                          ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] font-semibold shadow-sm'
                          : 'text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]'
                      )}
                      title={!isSidebarOpen ? tab.label : undefined}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      {isSidebarOpen && <span>{tab.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer details redesigned */}
            <div className={cn('pt-4 border-t border-[color:var(--border)] text-[9px] text-[color:var(--muted)] opacity-60 text-center', isSidebarOpen ? '' : 'truncate')}>
              {isSidebarOpen ? 'My-Notion v1.0 · Academic Tool' : 'v1.0'}
            </div>
          </div>
        </aside>

        {/* 3. Main content workspace views inside scrollable containment */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <PageContainer animate={true}>
            
            {activeTab === 'home' && (
              <div className="space-y-6">
                <SectionHeader 
                  title="Welcome to your workspace."
                  subtitle="Keep track of your academic papers, classes, deadlines, and daily agenda under one cohesive, custom-grounded AI-assisted workspace."
                  category="Today inside My-Notion"
                />

                <div className="grid gap-6 lg:grid-cols-3">
                  
                  {/* Left Welcome block */}
                  <Card spotlight={true} className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[220px]">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-xs text-[color:var(--accent)] font-semibold">
                        <Sparkles className="h-4 w-4" />
                        Interactive Context Aware Engine
                      </div>
                      <h2 className="text-xl font-bold font-heading text-[color:var(--text)]">
                        Manage your classes and notes effortlessly
                      </h2>
                      <p className="text-xs text-[color:var(--muted)] max-w-xl leading-relaxed">
                        Create standard academic spaces, upload files/slides, and use standard Gemini LLM configurations to run notes highlights, summaries, exam quizzes, or calendar scheduling prompts.
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2.5 shrink-0">
                      <Button variant="primary" size="sm" onClick={() => navigateToTab('academic')}>
                        Explore Academics
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigateToTab('personal')}>
                        View Personal Focus
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setIsAiPanelOpen(true)} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                        Ask AI Assistant
                      </Button>
                    </div>
                  </Card>

                  {/* Right Context summary */}
                  <div className="flex flex-col gap-4">
                    <Card spotlight={true} className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)] mb-3">Workspace status</p>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between rounded-xl bg-[color:var(--surface-low)] px-3 py-2 border border-[color:var(--border)]">
                            <span className="text-[color:var(--muted)]">Academic modules</span>
                            <span className="font-bold text-[color:var(--text)]">{state.modules.length}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-[color:var(--surface-low)] px-3 py-2 border border-[color:var(--border)]">
                            <span className="text-[color:var(--muted)]">Open tasks</span>
                            <span className="font-bold text-[color:var(--text)]">{state.tasks.filter(t => !t.done).length}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card spotlight={true} className="p-4 flex-1 flex flex-col justify-center">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">System status</p>
                        <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Gemini 1.5 RAG Ready
                        </h3>
                      </div>
                    </Card>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'academic' && !activeModuleId && (
              <div className="animate-fade-up">
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
              <div className="animate-fade-up">
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
              <div className="animate-fade-up">
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
              <div className="animate-fade-up">
                <CalendarView 
                  events={state.events} 
                  onAddEvent={addEvent} 
                  onRemoveEvent={removeEvent} 
                  onUpdateEvent={updateEvent} 
                />
              </div>
            )}

          </PageContainer>
        </div>
      </div>

      {/* 4. Global Drawer Assistant (Sidebar panel on desktop, slide modal on mobile) */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <GlobalChat
            onClose={() => setIsAiPanelOpen(false)}
            state={state}
            saveGlobalChatMessage={saveGlobalChatMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
