import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CalendarClock,
  Bell,
  ChevronLeft,
  Home,
  Library,
  LayoutDashboard,
  UserRound,
  Settings,
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
import { SettingsPage } from './components/SettingsPage';
import { AboutPage } from './components/AboutPage';
import { NotificationsPage } from './components/NotificationsPage';
import Timetable from './components/Timetable';
import { useAutoHideNavbar } from './hooks/useAutoHideNavbar';
import { loadRecentPage, saveRecentPage } from './lib/recentPage';
import { buildWorkspaceNotifications, type WorkspaceNotificationItem, type WorkspaceTab } from './lib/notifications';
import { addTimetableEntry, generateTimetableOccurrences, loadTimetableEntries, removeTimetableEntry, updateTimetableEntry } from './lib/timetable';
import { API_BASE } from './lib/api';
import { TimetableEntry } from './types';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';

const READ_NOTIFICATION_STORAGE_KEY = 'my_notion_read_notifications';

const WORKSPACE_NAV_ITEMS = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'academic' as const, label: 'Academic', icon: Library },
  { id: 'personal' as const, label: 'Personal', icon: LayoutDashboard },
  { id: 'timetable' as const, label: 'Timetable', icon: CalendarClock },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
  { id: 'profile' as const, label: 'About', icon: UserRound },
];

function parseWorkspaceTab(value: string | null): WorkspaceTab {
  if (
    value === 'academic' ||
    value === 'personal' ||
    value === 'timetable' ||
    value === 'calendar' ||
    value === 'notifications' ||
    value === 'settings' ||
    value === 'profile' ||
    value === 'home'
  ) {
    return value;
  }
  return 'home';
}

function parseAppStage(value: string | null): 'landing' | 'workspace' {
  return value === 'workspace' ? 'workspace' : 'landing';
}

function loadReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function saveReadNotificationIds(next: string[]) {
  localStorage.setItem(READ_NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(READ_NOTIFICATION_STORAGE_KEY, { detail: next }));
}

async function saveReadNotificationIdsToServer(next: string[]) {
  try {
    await fetch(`${API_BASE}/api/data/notifications/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readNotificationIds: next }),
    });
  } catch (error) {
    console.error('Error saving notification read state to server:', error);
  }
}

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
    removeModule,
    saveGlobalChatMessage, 
    addEvent, 
    removeEvent, 
    updateEvent,
    toggleTask,
    refreshWorkspace
  } = useAppStore();
  
  // Persistence state from localStorage
  const [appStage, setAppStage] = useState<'landing' | 'workspace'>(() => {
    const params = new URLSearchParams(window.location.search);
    return parseAppStage(params.get('stage'));
  });

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) return parseWorkspaceTab(tab);
    return parseWorkspaceTab(localStorage.getItem('my_notion_tab'));
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
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => loadReadNotificationIds());
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>(() => loadTimetableEntries());
  const pwaInstall = usePwaInstallPrompt();
  
  const searchRef = useRef<HTMLDivElement | null>(null);

  const navScrollResetKey = `${activeTab}:${activeModuleId ?? ''}`;
  useAutoHideNavbar(appStage === 'workspace', mainScrollEl, setIsNavbarVisible, navScrollResetKey);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Keep a CSS variable up-to-date for responsive layouts and to help trigger
  // lightweight reflows on resize (debounced).
  useEffect(() => {
    let t: number | null = null;
    const setVars = () => {
      document.documentElement.style.setProperty('--window-width', String(window.innerWidth));
      document.documentElement.style.setProperty('--window-height', String(window.innerHeight));
    };
    const onResize = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        setVars();
        t = null;
      }, 120);
    };
    setVars();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (t) window.clearTimeout(t);
    };
  }, []);

  // Save UI Preferences inside localStorage
  useEffect(() => {
    localStorage.removeItem('my_notion_stage');
  }, []);

  useEffect(() => {
    const syncReadNotificationIds = () => {
      setReadNotificationIds(loadReadNotificationIds());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === READ_NOTIFICATION_STORAGE_KEY) {
        syncReadNotificationIds();
      }
    };

    const handleCustomUpdate = (event: Event) => {
      if (event.type === READ_NOTIFICATION_STORAGE_KEY) {
        syncReadNotificationIds();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(READ_NOTIFICATION_STORAGE_KEY, handleCustomUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(READ_NOTIFICATION_STORAGE_KEY, handleCustomUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncNotificationReadState = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/data/notifications/read`);
        if (!response.ok) return;
        const data = await response.json();
        const serverIds = Array.isArray(data?.readNotificationIds)
          ? data.readNotificationIds.filter((value: unknown) => typeof value === 'string')
          : [];

        if (!isMounted) return;

        setReadNotificationIds((current) => {
          const merged = Array.from(new Set([...current, ...serverIds]));
          saveReadNotificationIds(merged);
          if (merged.length !== serverIds.length) {
            void saveReadNotificationIdsToServer(merged);
          }
          return merged;
        });
      } catch (error) {
        console.error('Error loading notification read state from server:', error);
      }
    };

    void syncNotificationReadState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
      setAppStage(parseAppStage(p.get('stage')));
      setActiveTab(parseWorkspaceTab(p.get('tab')));
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
    setActiveModuleId(tab === 'academic' ? moduleId : null);
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

  const notificationItems = useMemo<WorkspaceNotificationItem[]>(
    () => {
      const timetableEvents = generateTimetableOccurrences(timetableEntries).map((occurrence) => {
        const module = state.modules.find((entry) => entry.id === occurrence.moduleId);
        return {
          id: occurrence.id,
          title: module ? `${module.code} ${occurrence.kind}` : occurrence.kind,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          description: module ? module.title : occurrence.kind,
          reminderMinutes: occurrence.reminderMinutes,
          color: 'blue' as const,
        };
      });

      return buildWorkspaceNotifications({
        tasks: state.tasks,
        events: [...state.events, ...timetableEvents],
        modules: state.modules,
        readNotificationIds,
      });
    },
    [readNotificationIds, state.events, state.modules, state.tasks, timetableEntries]
  );

  const unreadNotificationItems = useMemo(
    () => notificationItems.filter((item) => !item.isRead),
    [notificationItems]
  );

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
        id: 'tab-timetable',
        kind: 'tab',
        title: 'Timetable',
        subtitle: 'Weekly classes and reminders',
        keywords: ['timetable', 'schedule', 'lecture', 'lab', 'tutorial'],
        actionLabel: 'Open page',
        tab: 'timetable',
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
      {
        id: 'tab-notifications',
        kind: 'tab',
        title: 'Notifications',
        subtitle: 'Due dates and reminders',
        keywords: ['notifications', 'reminders', 'alerts', 'bell'],
        actionLabel: 'Open page',
        tab: 'notifications',
      },
      {
        id: 'tab-settings',
        kind: 'tab',
        title: 'Settings',
        subtitle: 'Themes and workspace preferences',
        keywords: ['settings', 'theme', 'themes', 'appearance', 'preferences'],
        actionLabel: 'Open page',
        tab: 'settings',
      },
      {
        id: 'tab-profile',
        kind: 'tab',
        title: 'About',
        subtitle: 'Project info and links',
        keywords: ['about', 'github', 'portfolio'],
        actionLabel: 'Open page',
        tab: 'profile',
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
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
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
    if (activeTab === 'timetable') return 'Timetable';
    if (activeTab === 'calendar') return 'Schedule';
    if (activeTab === 'notifications') return 'Notifications';
    if (activeTab === 'settings') return 'Settings';
    if (activeTab === 'profile') return 'About';
    return 'Dashboard';
  }, [activeTab, activeModule]);

  useEffect(() => {
    if (appStage !== 'workspace' || activeTab === 'home' || activeTab === 'settings' || activeTab === 'profile' || activeTab === 'notifications') return;
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

  const unreadNotificationCount = unreadNotificationItems.length;

  const markNotificationRead = useCallback((notificationId: string) => {
    setReadNotificationIds((current) => {
      const next = current.includes(notificationId) ? current : [...current, notificationId];
      saveReadNotificationIds(next);
      void saveReadNotificationIdsToServer(next);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const next = Array.from(new Set([...readNotificationIds, ...notificationItems.map((item) => item.id)]));
    saveReadNotificationIds(next);
    void saveReadNotificationIdsToServer(next);
    setReadNotificationIds(next);
  }, [notificationItems, readNotificationIds]);

  const openNotificationItem = useCallback(
    (item: WorkspaceNotificationItem) => {
      markNotificationRead(item.id);
      openWorkspaceTab(item.targetTab, item.moduleId ?? null);
    },
    [markNotificationRead]
  );

  const handleOpenNotifications = useCallback(() => {
    setIsNotificationsOpen((current) => !current);
    setIsSearchOpen(false);
  }, []);

  const handleAddTimetableEntry = useCallback((entry: Omit<TimetableEntry, 'id'>) => {
    const created = addTimetableEntry(entry);
    setTimetableEntries((current) => [...current, created]);
    return created;
  }, []);

  const handleRemoveTimetableEntry = useCallback((id: string) => {
    removeTimetableEntry(id);
    setTimetableEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const handleUpdateTimetableEntry = useCallback((id: string, updates: Partial<Omit<TimetableEntry, 'id'>>) => {
    updateTimetableEntry(id, updates);
    setTimetableEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  }, []);

  const handleChatAction = useCallback(async (action: { action: string; [key: string]: unknown }) => {
    switch (action.action) {
      case 'refresh_workspace':
        await refreshWorkspace();
        return;
      case 'create_timetable_entry': {
        const timetableEntry = action.timetableEntry as Omit<TimetableEntry, 'id'> | undefined;
        if (timetableEntry) handleAddTimetableEntry(timetableEntry);
        return;
      }
      case 'update_timetable_entry': {
        const timetableEntryId = action.timetableEntryId as string | undefined;
        const updates = action.updates as Partial<Omit<TimetableEntry, 'id'>> | undefined;
        if (timetableEntryId && updates) handleUpdateTimetableEntry(timetableEntryId, updates);
        return;
      }
      case 'delete_timetable_entry': {
        const timetableEntryId = action.timetableEntryId as string | undefined;
        if (timetableEntryId) handleRemoveTimetableEntry(timetableEntryId);
        return;
      }
      case 'delete_module': {
        const deletedModule = action.deletedModule as { id?: string } | undefined;
        if (deletedModule?.id && activeModuleId === deletedModule.id) {
          setActiveModuleId(null);
        }
        await refreshWorkspace();
        return;
      }
      case 'create_module':
      case 'update_module':
        await refreshWorkspace();
        return;
      default:
        return;
    }
  }, [activeModuleId, handleAddTimetableEntry, handleRemoveTimetableEntry, handleUpdateTimetableEntry, refreshWorkspace]);

  const landingModuleCodes = useMemo(
    () => state.modules.slice(0, 4).map((m) => m.code),
    [state.modules]
  );

  const handleNavbarSearchResult = useCallback(
    (id: string) => {
      const result = searchResults.find((r) => r.id === id);
      if (result) runSearchResult(result);
    },
    [searchResults]
  );

  const navbarProps = useMemo(
    () => ({
      activeBreadcrumb,
      searchQuery,
      onSearchChange: setSearchQuery,
      isSearchOpen,
      onSearchOpen: setIsSearchOpen,
      searchResults: navbarSearchResults,
      onRunSearchResult: handleNavbarSearchResult,
      searchRef,
      upcomingCount: unreadNotificationCount,
      onOpenNotifications: handleOpenNotifications,
      notificationItems,
      onOpenNotificationItem: openNotificationItem,
      onMarkAllNotificationsRead: markAllNotificationsRead,
      isNotificationsOpen,
      onNotificationsOpen: setIsNotificationsOpen,
      onOpenMobileSidebar: () => setIsMobileSidebarOpen(true),
      onGoLanding: () => setAppStage('landing'),
      onOpenAi: () => setIsAiPanelOpen(true),
    }),
    [
      activeBreadcrumb,
      searchQuery,
      isSearchOpen,
      navbarSearchResults,
      handleNavbarSearchResult,
      unreadNotificationCount,
      handleOpenNotifications,
      notificationItems,
      openNotificationItem,
      markAllNotificationsRead,
      isNotificationsOpen,
    ]
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
      <div
        className={cn(
          'workspace-navbar-slot shrink-0',
          isNavbarVisible ? 'workspace-navbar-slot--visible' : 'workspace-navbar-slot--hidden'
        )}
        aria-hidden={!isNavbarVisible}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className={cn('workspace-navbar-inner', !isNavbarVisible && 'pointer-events-none')}>
          <WorkspaceNavbar {...navbarProps} />
        </div>
      </div>

      <div
        className={cn(
          'workspace-body-row relative flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-4 lg:gap-6 max-md:pb-24',
          !isNavbarVisible && 'workspace-body-row--nav-hidden'
        )}
        style={{ willChange: 'transform' }}
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
                className="workspace-mobile-drawer fixed z-40 flex flex-col justify-between border border-[color:var(--border)] bg-[color:var(--surface-low)] p-4 shadow-2xl md:hidden"
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
                    {WORKSPACE_NAV_ITEMS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            navigateToTab(tab.id);
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

        {/* Sidebar — full height, separate from content navbar */}
        <div
          className={cn(
            'relative hidden min-h-0 shrink-0 self-stretch md:flex md:flex-col',
            isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'
          )}
          style={{
            width: isSidebarOpen ? 'clamp(12rem,16vw,15.5rem)' : 'clamp(4.5rem,4.5vw,5rem)',
            transition: 'width 300ms ease',
            willChange: 'width',
            contain: 'layout style paint',
          }}
        >
          <aside
            className={cn(
              'workspace-sidebar-panel flex h-full flex-col py-4',
              isSidebarOpen ? 'px-4' : 'px-3'
            )}
            style={{ willChange: 'padding', contain: 'layout style paint' }}
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
                {WORKSPACE_NAV_ITEMS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigateToTab(tab.id)}
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
          className="workspace-main-panel min-h-0 min-w-0 flex-1"
          style={{ contain: 'layout style paint' }}
        >
          <div className="workspace-main-content">
          {activeTab === 'home' ? (
            <HomeDashboard
              state={state}
              recentPage={recentPage}
              onExploreAcademic={() => navigateToTab('academic')}
              onViewPersonal={() => navigateToTab('personal')}
              onAskAi={() => setIsAiPanelOpen(true)}
              onOpenRecent={recentPage && recentPage.tab !== 'home' ? openRecentPage : undefined}
              pwaInstall={{
                canInstall: pwaInstall.canInstall,
                isInstalled: pwaInstall.isInstalled,
                onInstall: async () => {
                  await pwaInstall.promptInstall();
                },
              }}
              className="min-w-0"
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
                      onEditModule={updateModule}
                      onRemoveModule={removeModule}
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
                  refreshWorkspace={refreshWorkspace}
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

            {activeTab === 'timetable' && (
              <div>
                <Timetable
                  modules={state.modules}
                  entries={timetableEntries}
                  onAddEntry={handleAddTimetableEntry}
                  onUpdateEntry={handleUpdateTimetableEntry}
                  onRemoveEntry={handleRemoveTimetableEntry}
                />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <NotificationsPage
                  items={notificationItems}
                  onOpenItem={openNotificationItem}
                  onMarkRead={markNotificationRead}
                  onMarkAllRead={markAllNotificationsRead}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <SettingsPage />
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <AboutPage />
              </div>
            )}
          </PageContainer>
          )}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 items-center justify-around border-t border-[color:var(--border)] bg-[color:var(--surface-med)]/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md will-change-transform transform-gpu md:hidden">
        {WORKSPACE_NAV_ITEMS.filter((tab) => ['home', 'academic', 'personal', 'timetable'].includes(tab.id)).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigateToTab(tab.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] transition-colors',
                isActive ? 'text-[color:var(--accent)] font-semibold' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Global Modals/Drawers */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <GlobalChat
            onClose={() => setIsAiPanelOpen(false)}
            state={state}
            saveGlobalChatMessage={saveGlobalChatMessage}
            refreshWorkspace={refreshWorkspace}
            timetableEntries={timetableEntries}
            onAction={handleChatAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}