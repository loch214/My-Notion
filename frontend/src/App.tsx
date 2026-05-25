import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  Home,
  Library,
  LayoutDashboard,
  Sparkles,
  X,
  Menu,
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
import { PageContainer } from './components/ui/PageContainer';
import { LandingPage } from './components/LandingPage';
import { HomeDashboard } from './components/HomeDashboard';
import { WorkspaceNavbar } from './components/WorkspaceNavbar';
import { useAutoHideNavbar } from './hooks/useAutoHideNavbar';
import { loadRecentPage, saveRecentPage } from './lib/recentPage';

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
    return 'landing';
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
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [recentPage, setRecentPage] = useState(() => loadRecentPage());
  const [mainScrollEl, setMainScrollEl] = useState<HTMLDivElement | null>(null);
  
  const searchRef = useRef<HTMLDivElement | null>(null);

  useAutoHideNavbar(appStage === 'workspace', mainScrollEl, setIsNavbarVisible, activeTab);

  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Save UI Preferences inside localStorage
  useEffect(() => {
    localStorage.removeItem('my_notion_stage');
  }, []);

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

  const enterWorkspace = () => {
    setAppStage('workspace');
    setActiveTab('home');
    setActiveModuleId(null);
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
          .filter((result): result is SearchResult & { score: number } => result !== null)
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

  useEffect(() => {
    if (appStage !== 'workspace' || activeTab === 'home') return;
    saveRecentPage({
      label: activeBreadcrumb,
      tab: activeTab,
      moduleId: activeModuleId,
    });
    setRecentPage(loadRecentPage());
  }, [appStage, activeTab, activeModuleId, activeBreadcrumb]);

  const openRecentPage = () => {
    const recent = loadRecentPage();
    if (!recent || recent.tab === 'home') return;
    setActiveTab(recent.tab);
    setActiveModuleId(recent.moduleId ?? null);
  };

  const navbarSearchResults = useMemo(
    () =>
      searchResults.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        subtitle: r.subtitle,
        actionLabel: r.actionLabel,
      })),
    [searchResults]
  );

  const navbarNotifications = useMemo(
    () =>
      upcomingNotifications.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        onSelect: () => {
          item.action();
          setIsNotificationsOpen(false);
        },
      })),
    [upcomingNotifications]
  );

  const landingModuleCodes = useMemo(
    () => state.modules.slice(0, 4).map((m) => m.code),
    [state.modules]
  );

  if (appStage === 'landing') {
    return (
      <LandingPage
        onEnterWorkspace={enterWorkspace}
        moduleCodes={landingModuleCodes}
      />
    );
  }

  return (
    <div className="app-shell relative flex h-[100dvh] flex-col overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--text)] select-none">
      <WorkspaceNavbar
        isVisible={isNavbarVisible}
        activeBreadcrumb={activeBreadcrumb}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchOpen={isSearchOpen}
        onSearchOpen={setIsSearchOpen}
        searchResults={navbarSearchResults}
        onRunSearchResult={(id) => {
          const result = searchResults.find((r) => r.id === id);
          if (result) runSearchResult(result);
        }}
        searchRef={searchRef}
        notificationsRef={notificationsRef}
        upcomingCount={upcomingNotifications.length}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={() => {
          setIsNotificationsOpen((c) => !c);
          setIsSearchOpen(false);
        }}
        notifications={navbarNotifications}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onGoLanding={() => setAppStage('landing')}
        onOpenAi={() => setIsAiPanelOpen(true)}
      />

      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 transition-[padding] duration-300 ease md:flex-row md:gap-4 md:px-6 md:pb-6 lg:gap-6 lg:px-8 lg:pb-8',
          isNavbarVisible
            ? 'pt-[calc(var(--workspace-nav-height)+1rem)] md:pt-[calc(var(--workspace-nav-height)+1.5rem)] lg:pt-[calc(var(--workspace-nav-height)+2rem)]'
            : 'pt-4 md:pt-6 lg:pt-8'
        )}
      >
        
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
                transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="fixed left-0 top-0 bottom-0 z-40 w-60 max-w-[80vw] border-r border-[color:var(--border)] bg-[color:var(--surface-low)] p-4 flex flex-col justify-between shadow-2xl md:hidden max-md:top-0"
              >
                <div className="flex flex-col gap-6">
                  {/* Top logo */}
                  <div className="flex items-center justify-between pb-3 border-b border-[color:var(--border)]">
                    <span className="font-heading tracking-tight font-bold text-[color:var(--text)]">Loch's Workspace</span>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="rounded-full p-1.5 text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]"
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
                            'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-150 ease text-left w-full',
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

        {/* Collapsible Sidebar — inset panel below navbar (rounded top, not flush to window) */}
        <div
          className={cn(
            'relative hidden min-w-0 shrink-0 md:block transition-[width] duration-300 ease',
            isSidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          <div className="workspace-sidebar-fillet" aria-hidden />
          <aside
            className={cn(
              'workspace-sidebar-panel flex h-full flex-col py-4 transition-all duration-300 ease',
              isSidebarOpen ? 'px-4' : 'px-3'
            )}
          >
          <div className="flex flex-col flex-1 justify-between">
            <div className="space-y-4">
              {/* Sidebar toggle buttons */}
              <div className={cn('flex items-center justify-between pb-3 border-b border-[color:var(--border)]', isSidebarOpen ? '' : 'justify-center')}>
                {isSidebarOpen && (
                  <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] font-heading">
                    Workspace
                  </span>
                )}
                <button
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="rounded-xl p-1.5 text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)] focus:outline-none"
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
                        'flex items-center gap-3 rounded-xl transition-all duration-150 ease text-left w-full relative',
                        isSidebarOpen ? 'px-4 py-3.5 text-base font-medium' : 'justify-center px-0 py-3.5 text-base',
                        isActive
                          ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] font-semibold shadow-sm'
                          : 'text-[color:var(--muted)] hover:bg-[color:var(--surface-med)] hover:text-[color:var(--text)]'
                      )}
                      title={!isSidebarOpen ? tab.label : undefined}
                    >
                      <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" />
                      {isSidebarOpen && <span>{tab.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer details redesigned */}
            <div className={cn('pt-4 border-t border-[color:var(--border)] text-[11px] text-[color:var(--muted)] opacity-60 text-center', isSidebarOpen ? '' : 'truncate')}>
              {isSidebarOpen ? 'My-Notion v1.0 · Academic Tool' : 'v1.0'}
            </div>
          </div>
          </aside>
        </div>

        <div
          ref={setMainScrollEl}
          className="workspace-main-panel flex min-h-0 flex-1 flex-col min-w-0 overflow-y-auto overflow-x-hidden"
        >
          {activeTab === 'home' ? (
            <HomeDashboard
              state={state}
              recentPage={recentPage}
              onExploreAcademic={() => navigateToTab('academic')}
              onViewPersonal={() => navigateToTab('personal')}
              onAskAi={() => setIsAiPanelOpen(true)}
              onOpenRecent={recentPage && recentPage.tab !== 'home' ? openRecentPage : undefined}
              className="min-h-0 min-w-0 flex-1"
            />
          ) : (
          <PageContainer animate={false}>
            {activeTab === 'academic' && !activeModuleId && (
              <div>
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
              <div>
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
              <div>
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
              <div>
                <CalendarView 
                  events={state.events} 
                  onAddEvent={addEvent} 
                  onRemoveEvent={removeEvent} 
                  onUpdateEvent={updateEvent} 
                />
              </div>
            )}
          </PageContainer>
          )}
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
