import { useState, useEffect } from 'react';
import { AppState, Module, Task, Event } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STATE: AppState = {
  modules: [],
  tasks: [],
  events: [],
  globalChatHistory: []
};

const API_BASE = 'http://localhost:3001/api/data';

export function useAppStore() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state from backend
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const response = await fetch(`${API_BASE}/workspace`);
        if (!response.ok) throw new Error('Failed to load workspace');
        const data = await response.json();
        setState({
          modules: data.modules || [],
          tasks: data.tasks || [],
          events: data.events || [],
          globalChatHistory: data.globalChatHistory || []
        });
      } catch (err) {
        console.error('Error loading workspace:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, []);

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setState(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  };

  const addModule = async (title: string, code: string, color: Module['color']) => {
    try {
      const response = await fetch(`${API_BASE}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, code, color })
      });
      if (!response.ok) throw new Error('Failed to create module');
      const newModule = await response.json();
      updateState(prev => ({
        ...prev,
        modules: [...prev.modules, newModule]
      }));
    } catch (err) {
      console.error('Error adding module:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const removeModule = async (moduleId: string) => {
    try {
      const response = await fetch(`${API_BASE}/modules/${moduleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete module');
      updateState(prev => ({
        ...prev,
        modules: prev.modules.filter(m => m.id !== moduleId)
      }));
    } catch (err) {
      console.error('Error removing module:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    try {
      const response = await fetch(`${API_BASE}/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update module');
      const updated = await response.json();
      updateState(prev => ({
        ...prev,
        modules: prev.modules.map(m => m.id === moduleId ? updated : m)
      }));
    } catch (err) {
      console.error('Error updating module:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const addTask = async (title: string, priority: 'high' | 'medium' | 'low' = 'medium', dueDate?: string, moduleId?: string) => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, dueDate, moduleId })
      });
      if (!response.ok) throw new Error('Failed to create task');
      const newTask = await response.json();
      updateState(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
    } catch (err) {
      console.error('Error adding task:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done })
      });
      if (!response.ok) throw new Error('Failed to update task');
      updateState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      }));
    } catch (err) {
      console.error('Error toggling task:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete task');
      updateState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
    } catch (err) {
      console.error('Error removing task:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const addEvent = async (title: string, startTime: string, endTime: string, color: Event['color'] = 'blue', description?: string) => {
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, endTime, color, description })
      });
      if (!response.ok) throw new Error('Failed to create event');
      const newEvent = await response.json();
      updateState(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
    } catch (err) {
      console.error('Error adding event:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const saveGlobalChatMessage = async (role: 'user' | 'model', text: string) => {
    try {
      const timestamp = new Date().toISOString();
      await fetch(`${API_BASE}/chat/global/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uuidv4(), role, text, timestamp })
      });
      updateState(prev => ({
        ...prev,
        globalChatHistory: [...prev.globalChatHistory, { id: uuidv4(), role, text, timestamp }]
      }));
    } catch (err) {
      console.error('Error saving global chat message:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const saveModuleChatMessage = async (moduleId: string, role: 'user' | 'model', text: string) => {
    try {
      const timestamp = new Date().toISOString();
      await fetch(`${API_BASE}/chat/module/${moduleId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uuidv4(), role, text, timestamp })
      });
      updateState(prev => ({
        ...prev,
        modules: prev.modules.map(m => m.id === moduleId 
          ? { ...m, chatHistory: [...m.chatHistory, { id: uuidv4(), role, text, timestamp }] }
          : m
        )
      }));
    } catch (err) {
      console.error('Error saving module chat message:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return { 
    state, 
    isLoading, 
    error,
    updateState, 
    addModule, 
    removeModule,
    updateModule,
    addTask, 
    toggleTask, 
    removeTask,
    addEvent,
    saveGlobalChatMessage,
    saveModuleChatMessage
  };
}
