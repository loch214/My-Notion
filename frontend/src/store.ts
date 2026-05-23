import { useState, useEffect } from 'react';
import { AppState, Module, Task, Event } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STATE: AppState = {
  modules: [],
  tasks: [],
  events: [],
  globalChatHistory: []
};

const API_BASE = 'http://localhost:3001/api';

export function useAppStore() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from backend
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [modulesRes, tasksRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE}/modules`),
          fetch(`${API_BASE}/tasks`),
          fetch(`${API_BASE}/events`),
        ]);

        if (!modulesRes.ok || !tasksRes.ok || !eventsRes.ok) {
          throw new Error('Failed to load data from server');
        }

        const modules = await modulesRes.json();
        const tasks = await tasksRes.json();
        const events = await eventsRes.json();

        setState({
          modules: modules || [],
          tasks: tasks || [],
          events: events || [],
          globalChatHistory: state.globalChatHistory,
        });
      } catch (err: any) {
        console.error('Failed to load initial data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setState(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  };

  const addModule = async (title: string, code: string, color: Module['color']) => {
    try {
      const moduleId = uuidv4();
      const response = await fetch(`${API_BASE}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moduleId, title, code, color }),
      });

      if (!response.ok) throw new Error('Failed to create module');

      const newModule = await response.json();
      setState(prev => ({
        ...prev,
        modules: [...prev.modules, newModule],
      }));
    } catch (err: any) {
      console.error('Error adding module:', err);
      setError(err.message);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? updatedTask : t),
      }));
    } catch (err: any) {
      console.error('Error toggling task:', err);
      setError(err.message);
    }
  };

  const addTask = async (title: string, priority: 'high' | 'medium' | 'low') => {
    try {
      const taskId = uuidv4();
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, title, priority, done: false, time: 'Anytime' }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const newTask = await response.json();
      setState(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
      }));
    } catch (err: any) {
      console.error('Error adding task:', err);
      setError(err.message);
    }
  };

  return {
    state,
    updateState,
    addModule,
    toggleTask,
    addTask,
    isLoading,
    error,
    saveModule: async (moduleId: string, updates: Partial<Module>) => {
      try {
        const response = await fetch(`${API_BASE}/modules/${moduleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to save module');
        const updated = await response.json();
        setState(prev => ({
          ...prev,
          modules: prev.modules.map(m => m.id === moduleId ? updated : m),
        }));
      } catch (err: any) {
        console.error('Error saving module:', err);
        setError(err.message);
      }
    },
    saveGlobalChat: async (message: any) => {
      try {
        const response = await fetch(`${API_BASE}/chat/global/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) throw new Error('Failed to save chat');
      } catch (err: any) {
        console.error('Error saving global chat:', err);
        setError(err.message);
      }
    },
  };
}
