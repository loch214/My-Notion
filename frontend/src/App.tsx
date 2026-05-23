import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronRight,
  Home,
  Library,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Sun,
  WandSparkles,
} from 'lucide-react';
import { useAppStore } from './store';
import { GlobalChat } from './components/GlobalChat.tsx';
import { AcademicOverview } from './components/AcademicOverview.tsx';
import { ModuleDetail } from './components/ModuleDetail.tsx';
import { PersonalDashboard } from './components/PersonalDashboard.tsx';
import { cn } from './lib/utils';

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: any }) {
  return (
    <div className="surface rounded-2xl p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, updateState, toggleTask, addModule, addTask } = useAppStore();
  const [appStage, setAppStage] = useState<'landing' | 'workspace'>('landing');
  const [activeTab, setActiveTab] = useState<'home' | 'academic' | 'personal'>('home');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('studentos-theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('studentos-theme', theme);
  }, [theme]);

  const activeModule = useMemo(
    () => state.modules.find((module) => module.id === activeModuleId) ?? null,
    [state.modules, activeModuleId]
  );

  const navigateToTab = (tab: 'home' | 'academic' | 'personal') => {
    setActiveTab(tab);
    setActiveModuleId(null);
  };

  const navItemClass = (isActive: boolean) => cn(
    'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200',
    isActive
      ? 'surface-soft text-[color:var(--text)] font-medium shadow-sm'
      : 'text-muted hover:surface-soft hover:text-[color:var(--text)]'
  );

  if (appStage === 'landing') {
    return (
      <div className="app-shell relative overflow-hidden text-[color:var(--text)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-sky-500/12 blur-3xl animate-drift" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl animate-drift" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
          <div className="absolute right-6 top-6">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="surface-soft rounded-full p-3 text-muted transition hover:text-[color:var(--text)]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <main className="flex w-full max-w-2xl flex-col items-center text-center animate-fade-up">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent text-white shadow-xl shadow-black/20">
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
    <div className="app-shell flex min-h-screen overflow-hidden">
      <aside className={cn('hidden md:flex md:w-80 md:flex-col md:gap-4 md:p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto', isSidebarOpen ? 'md:flex' : 'md:hidden')}>
        <div className="surface-strong rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-black/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Workspace</p>
                <h2 className="text-base font-semibold">Loch's Notion</h2>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-full p-2 text-muted transition hover:surface-soft hover:text-[color:var(--text)]"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="surface-strong rounded-3xl p-3">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">Views</div>
          <nav className="space-y-1">
            <button onClick={() => navigateToTab('home')} className={navItemClass(activeTab === 'home')}>
              <Home className="h-4 w-4" /> Home
            </button>
            <button onClick={() => navigateToTab('academic')} className={navItemClass(activeTab === 'academic' && !activeModuleId)}>
              <Library className="h-4 w-4" /> Academic
            </button>
            <button onClick={() => navigateToTab('personal')} className={navItemClass(activeTab === 'personal')}>
              <LayoutDashboard className="h-4 w-4" /> Personal
            </button>
          </nav>
        </div>

        <div className="surface-strong rounded-3xl p-3">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">Modules</div>
          <div className="space-y-1">
            {state.modules.map((module) => (
              <button
                key={module.id}
                onClick={() => {
                  setActiveTab('academic');
                  setActiveModuleId(module.id);
                }}
                className={navItemClass(activeModuleId === module.id)}
              >
                <BookOpen className={cn('h-4 w-4', activeModuleId === module.id ? 'text-accent' : 'text-muted')} />
                <span className="truncate">{module.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-strong mt-auto rounded-3xl p-4 md:sticky md:bottom-4">
          <div className="flex w-full items-center justify-between rounded-2xl surface-soft px-4 py-3 text-left text-sm font-medium text-muted">
            <span>My-Notion v1.0</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="surface-strong sticky top-0 z-20 m-3 mb-0 flex items-center justify-between rounded-3xl px-4 py-2.5 gap-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsSidebarOpen((open) => !open)}
              className={cn("rounded-full p-2 text-muted transition hover:surface-soft hover:text-[color:var(--text)]", isSidebarOpen ? "md:hidden" : "")}
              aria-label="Toggle sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="hidden sm:inline">Workspace</span>
                <ChevronRight className="hidden sm:inline h-3.5 w-3.5" />
                <span className="capitalize text-[color:var(--text)]">{activeTab}</span>
                {activeModule && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="max-w-[150px] sm:max-w-[180px] truncate text-accent">{activeModule.code}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-1 justify-center max-w-md w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search, ask, or jump..."
                className="w-full surface-soft border border-subtle rounded-full py-2 pl-10 pr-4 text-sm text-[color:var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted pointer-events-none">
                ⌘K
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 flex-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="surface-soft rounded-full p-2.5 text-muted transition hover:text-[color:var(--text)]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="surface-soft rounded-full p-2.5 text-muted transition hover:text-[color:var(--text)] hidden sm:block">
              <Bell className="h-4 w-4" />
            </button>
            <button className="surface-soft rounded-full p-2.5 text-muted transition hover:text-[color:var(--text)] hidden sm:block">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-6xl space-y-5">
            {activeTab === 'home' && (
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="surface-strong hero-ring rounded-[2rem] p-5 sm:p-6 animate-fade-up">
                  <div className="inline-flex items-center gap-2 rounded-full border border-subtle surface-soft px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Today inside My-Notion
                  </div>
                  <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    Welcome to your personal workspace.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                    Overview of your academics, personal tasks, and upcoming events. Keep everything organized and accessible in one place.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigateToTab('academic')}
                      className="btn-primary px-5 py-2.5 text-sm font-semibold"
                    >
                      Open academics <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigateToTab('personal')}
                      className="btn-secondary px-5 py-2.5 text-sm font-medium"
                    >
                      Open personal <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsAiPanelOpen(true)}
                      className="btn-secondary px-5 py-2.5 text-sm font-medium"
                    >
                      <Sparkles className="h-4 w-4" /> Ask AI
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="surface rounded-[2rem] p-4 animate-fade-up">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-muted">Workspace summary</p>
                        <h2 className="mt-2 text-2xl font-semibold">Quick context</h2>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-3 text-accent">
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

                    <div className="surface rounded-[2rem] p-4 animate-fade-up">
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
              <div className="surface-strong rounded-[2rem] p-5 sm:p-6 animate-fade-up">
                <AcademicOverview modules={state.modules} onOpenModule={setActiveModuleId} onAddModule={addModule} />
              </div>
            )}

            {activeTab === 'academic' && activeModuleId && activeModule && (
              <div className="surface-strong rounded-[2rem] p-4 sm:p-6 animate-fade-up">
                <ModuleDetail
                  module={activeModule}
                  onBack={() => setActiveModuleId(null)}
                  updateModule={(id: string, updates: Partial<typeof activeModule>) => updateState((prev) => ({
                    ...prev,
                    modules: prev.modules.map((module) => (module.id === id ? { ...module, ...updates } : module)),
                  }))}
                />
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="surface-strong rounded-[2rem] p-5 sm:p-6 animate-fade-up">
                <PersonalDashboard
                  tasks={state.tasks}
                  events={state.events}
                  onToggleTask={toggleTask}
                  onAddTask={addTask}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {isAiPanelOpen && (
        <GlobalChat
          onClose={() => setIsAiPanelOpen(false)}
          state={state}
          updateState={updateState}
        />
      )}
    </div>
  );
}
