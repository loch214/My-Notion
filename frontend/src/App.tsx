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
      ? 'bg-white/10 text-white shadow-[0_10px_40px_rgba(0,0,0,0.16)]'
      : 'text-slate-300 hover:bg-white/5 hover:text-white'
  );

  if (appStage === 'landing') {
    return (
      <div className="app-shell relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl animate-drift" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl animate-drift" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="surface flex items-center justify-between rounded-3xl px-4 py-3 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">StudentOS</p>
                <h1 className="text-base font-semibold">My-Notion workspace</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="surface-soft rounded-full p-2.5 text-muted transition hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setAppStage('workspace')}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:scale-[1.02]"
              >
                Enter workspace
              </button>
            </div>
          </header>

          <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-14">
            <section className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted">
                <WandSparkles className="h-3.5 w-3.5 text-accent" />
                2026 student command center
              </span>
              <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                A single calm place for your university life.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Academic modules, lecture files, tasks, calendar, and AI study help in one modern workspace. No login maze, no extra clutter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setAppStage('workspace')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5"
                >
                  Start the workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                </button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <StatCard label="Modules" value={`${state.modules.length}`} hint="Academic spaces ready for files and chat." icon={BookOpen} />
                <StatCard label="Tasks" value={`${state.tasks.length}`} hint="Personal work and deadlines in one view." icon={CheckSquare} />
                <StatCard label="Events" value={`${state.events.length}`} hint="Study sessions and calendar reminders." icon={Calendar} />
              </div>
            </section>

            <aside className="grid gap-4 animate-fade-up lg:justify-self-end">
              <div className="surface-strong hero-ring rounded-[2rem] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">AI stack</p>
                    <h3 className="mt-2 text-2xl font-semibold">Gemini + Claude</h3>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Gemini Flash</span>
                      <span className="text-xs text-muted">fast</span>
                    </div>
                  </div>
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Gemini 3.1 Pro</span>
                      <span className="text-xs text-muted">deep reasoning</span>
                    </div>
                  </div>
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Claude Sonnet / Opus</span>
                      <span className="text-xs text-muted">writing + analysis</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface rounded-[2rem] p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">What is inside</p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/5 p-2 text-accent"><Library className="h-4 w-4" /></div>
                    <div>
                      <h4 className="font-semibold">Academic dashboard</h4>
                      <p className="text-sm text-muted">Modules, lecture files, and AI study chats.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/5 p-2 text-accent"><LayoutDashboard className="h-4 w-4" /></div>
                    <div>
                      <h4 className="font-semibold">Personal dashboard</h4>
                      <p className="text-sm text-muted">Tasks, calendar, and daily planning.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/5 p-2 text-accent"><Sparkles className="h-4 w-4" /></div>
                    <div>
                      <h4 className="font-semibold">Global AI memory</h4>
                      <p className="text-sm text-muted">One assistant across the whole workspace.</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen overflow-hidden">
      <aside className={cn('hidden md:flex md:w-80 md:flex-col md:gap-4 md:p-4', isSidebarOpen ? 'md:flex' : 'md:hidden')}>
        <div className="surface-strong rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Workspace</p>
                <h2 className="text-base font-semibold">Loch's Notion</h2>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">
            <button className="surface-soft flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-muted transition hover:text-white">
              <Search className="h-4 w-4" />
              Search, ask, or jump to a module
              <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted">⌘K</span>
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

        <div className="surface-strong mt-auto rounded-3xl p-4">
          <button
            onClick={() => setIsAiPanelOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-accent px-4 py-3 text-left text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Ask AI Assistant
            </span>
            <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">AI</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="surface-strong sticky top-0 z-20 m-4 mb-0 flex items-center justify-between rounded-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Toggle sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="capitalize text-white">{activeTab}</span>
                {activeModule && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="max-w-[180px] truncate text-accent">{activeModule.code}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="surface-soft rounded-full p-2.5 text-muted transition hover:text-white"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="surface-soft rounded-full p-2.5 text-muted transition hover:text-white">
              <Bell className="h-4 w-4" />
            </button>
            <button className="surface-soft rounded-full p-2.5 text-muted transition hover:text-white">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {activeTab === 'home' && (
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="surface-strong hero-ring rounded-[2rem] p-6 sm:p-8 animate-fade-up">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Today inside StudentOS
                  </div>
                  <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    A focused dashboard for study, planning, and AI support.
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                    Start from here, then jump into academics or personal planning. The whole workspace uses one clean visual system and keeps your AI access available everywhere.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigateToTab('academic')}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    >
                      Open academics <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsAiPanelOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <Sparkles className="h-4 w-4" /> Ask AI
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="surface rounded-[2rem] p-5 animate-fade-up">
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
                        <span className="font-semibold text-white">{state.modules.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl surface-soft px-4 py-3">
                        <span>Personal tasks</span>
                        <span className="font-semibold text-white">{state.tasks.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl surface-soft px-4 py-3">
                        <span>Calendar events</span>
                        <span className="font-semibold text-white">{state.events.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="surface rounded-[2rem] p-5 animate-fade-up">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Entry points</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <button onClick={() => navigateToTab('academic')} className="surface-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:text-white">
                        <span>Academic dashboard</span>
                        <ArrowRight className="h-4 w-4 text-accent" />
                      </button>
                      <button onClick={() => navigateToTab('personal')} className="surface-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:text-white">
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
