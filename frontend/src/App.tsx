import { useState } from 'react';
import { BookOpen, Calendar, CheckSquare, LayoutDashboard, Settings, Sparkles, Library, ChevronRight, Search, Bell, Home, ArrowRight } from 'lucide-react';
import { useAppStore } from './store';
import { GlobalChat } from './components/GlobalChat';
import { AcademicOverview } from './components/AcademicOverview';
import { ModuleDetail } from './components/ModuleDetail';
import { PersonalDashboard } from './components/PersonalDashboard';
import { cn } from './lib/utils';

export default function App() {
  const { state, updateState, toggleTask, addModule, addTask } = useAppStore();
  const [activeTab, setActiveTab] = useState<'home' | 'academic' | 'personal'>('home');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  // View routing
  const navigateToTab = (tab: 'home' | 'academic' | 'personal') => {
    setActiveTab(tab);
    setActiveModuleId(null);
  };

  const navItemClass = (isActive: boolean) => cn(
    "w-full flex items-center px-2 py-1.5 text-sm rounded-md transition-colors font-medium",
    isActive ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100 font-normal"
  );

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans antialiased overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* SidebarNavigation */}
      <aside className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col hidden md:flex shrink-0">
        {/* User / Workspace Header */}
        <div className="h-14 flex items-center px-4 border-b border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors group">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs mr-3 shadow-inner group-hover:shadow-md transition-all">
            L
          </div>
          <span className="font-semibold text-sm text-slate-700">Loch's Workspace</span>
        </div>

        {/* Global Search / Action */}
        <div className="p-4 pb-2">
          <button className="w-full flex items-center px-3 py-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 hover:ring-2 hover:ring-indigo-50 transition-all focus:outline-none">
            <Search className="w-4 h-4 mr-2 text-slate-400" />
            Search or ask AI...
            <span className="ml-auto text-[10px] font-semibold border border-slate-200 rounded px-1.5 py-0.5 text-slate-400 bg-slate-50">⌘K</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-6 scrollbar-hide">
          
          {/* Main Dashboards */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Views</div>
            <ul className="space-y-1">
              <li>
                <button onClick={() => navigateToTab('home')} className={navItemClass(activeTab === 'home')}>
                  <Home className={cn("w-4 h-4 mr-2.5", activeTab === 'home' ? 'text-indigo-600' : '')} />
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => navigateToTab('academic')} className={navItemClass(activeTab === 'academic' && !activeModuleId)}>
                  <Library className={cn("w-4 h-4 mr-2.5", activeTab === 'academic' && !activeModuleId ? 'text-indigo-600' : '')} />
                  Academic
                </button>
              </li>
              <li>
                <button onClick={() => navigateToTab('personal')} className={navItemClass(activeTab === 'personal')}>
                  <LayoutDashboard className={cn("w-4 h-4 mr-2.5", activeTab === 'personal' ? 'text-indigo-600' : '')} />
                  Personal
                </button>
              </li>
            </ul>
          </div>

          {/* Academic Modules */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
              Modules
            </div>
            <ul className="space-y-1">
              {state.modules.map(mod => (
                <li key={mod.id}>
                  <button 
                    onClick={() => { setActiveTab('academic'); setActiveModuleId(mod.id); }}
                    className={navItemClass(activeModuleId === mod.id)}
                  >
                    <BookOpen className={cn("w-4 h-4 mr-2.5 transition-colors", 
                      activeModuleId === mod.id ? "text-indigo-600" :
                      mod.color === 'amber' ? 'text-amber-500' : mod.color === 'blue' ? 'text-blue-500' : 'text-emerald-500'
                    )} />
                    <span className="truncate">{mod.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Personal Tools */}
          <div>
             <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Tools</div>
              <ul className="space-y-1">
                  <li>
                    <button className={navItemClass(false)}>
                      <CheckSquare className="w-4 h-4 mr-2.5" /> Tasks
                    </button>
                  </li>
                  <li>
                    <button className={navItemClass(false)}>
                      <Calendar className="w-4 h-4 mr-2.5" /> Calendar
                    </button>
                  </li>
              </ul>
          </div>

        </nav>

        {/* Global AI Assistant Trigger */}
        <div className="p-4 mt-auto border-t border-slate-200 bg-slate-50">
           <button 
             onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
             className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors shadow-sm group"
           >
              <div className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-500 group-hover:scale-110 transition-transform" />
                Ask AI Assistant
              </div>
              <span className="text-xs text-indigo-400 bg-white px-1.5 rounded-md border border-indigo-100 shadow-sm font-mono">/</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Top Bar for Mobile / Breadcrumbs */}
          <header className="h-14 border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 bg-white/80 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center text-sm text-slate-500">
               <span className="hover:text-slate-800 cursor-pointer transition-colors hidden sm:inline">Workspace</span>
               <ChevronRight className="w-3.5 h-3.5 mx-1.5 hidden sm:inline text-slate-300" />
               {activeTab !== 'home' ? (
                 <span className="text-slate-800 font-medium capitalize flex items-center">
                   {activeTab} Dashboard
                 </span>
               ) : (
                 <span className="text-slate-800 font-medium capitalize flex items-center">
                   Home
                 </span>
               )}
               {activeModuleId && (
                 <>
                   <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300" />
                   <span className="text-indigo-600 font-medium truncate max-w-[150px] sm:max-w-xs cursor-pointer">
                     {state.modules.find(m => m.id === activeModuleId)?.code}
                   </span>
                 </>
               )}
            </div>
            <div className="flex items-center space-x-3">
              <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-indigo-50">
                <Bell className="w-4.5 h-4.5" />
              </button>
               <button className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-full hover:bg-slate-100">
                <Settings className="w-4.5 h-4.5" />
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
              
              {activeTab === 'home' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                  <header>
                    <h1 className="text-3xl font-semibold tracking-tight mb-2 text-slate-900">Welcome to StudentOS</h1>
                    <p className="text-slate-500">Your central hub for academic modules and personal productivity.</p>
                  </header>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div 
                       onClick={() => navigateToTab('academic')}
                       className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer flex flex-col items-start"
                     >
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Library className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Academic Dashboard</h2>
                        <p className="text-sm text-slate-500 mb-6 flex-1">Manage your university modules, upload course materials, and study intelligently with AI-assisted RAG chat.</p>
                        <div className="flex items-center text-sm font-medium text-indigo-600">
                           View Modules <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>

                     <div 
                       onClick={() => navigateToTab('personal')}
                       className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer flex flex-col items-start"
                     >
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Personal Dashboard</h2>
                        <p className="text-sm text-slate-500 mb-6 flex-1">Stay on top of your schedule, manage your to-do lists, and organize personal notes outside of classes.</p>
                        <div className="flex items-center text-sm font-medium text-emerald-600">
                           View Tasks & Calendar <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm"><Sparkles className="w-6 h-6 text-indigo-600" /></div>
                     <div>
                        <h3 className="font-semibold text-indigo-900 mb-1">Global AI Assistant</h3>
                        <p className="text-sm text-indigo-800/70 mb-3 max-w-2xl">Use <kbd className="px-1.5 bg-white border border-indigo-200 rounded text-xs font-sans text-indigo-600 font-semibold shadow-sm">⌘K</kbd> anywhere or click "Ask AI Assistant" in the sidebar to chat. Your AI has context across all your modules, tasks, and calendar events.</p>
                        <button onClick={() => setIsAiPanelOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">Start Chatting</button>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && !activeModuleId && (
                <AcademicOverview 
                  modules={state.modules} 
                  onOpenModule={setActiveModuleId} 
                  onAddModule={addModule}
                />
              )}

              {activeTab === 'academic' && activeModuleId && (
                <ModuleDetail 
                  module={state.modules.find(m => m.id === activeModuleId)!}
                  onBack={() => setActiveModuleId(null)}
                  updateModule={(id, updates) => updateState(prev => ({
                    ...prev,
                    modules: prev.modules.map(m => m.id === id ? { ...m, ...updates } : m)
                  }))}
                />
              )}

              {activeTab === 'personal' && (
                <PersonalDashboard 
                  tasks={state.tasks} 
                  events={state.events} 
                  onToggleTask={toggleTask}
                  onAddTask={addTask}
                />
              )}
            </div>
          </div>
      </main>

      {/* Global AI Assistant Drawer */}
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
