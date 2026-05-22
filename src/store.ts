import { useState, useEffect } from 'react';
import { AppState, Module, Task, Event } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STATE: AppState = {
  modules: [
    {
      id: uuidv4(),
      code: 'CS-201',
      title: 'Software Engineering',
      color: 'amber',
      files: [],
      chatHistory: []
    },
    {
      id: uuidv4(),
      code: 'CS-202',
      title: 'Database Systems',
      color: 'blue',
      files: [],
      chatHistory: []
    },
    {
      id: uuidv4(),
      code: 'CS-203',
      title: 'Data Structures',
      color: 'emerald',
      files: [],
      chatHistory: []
    }
  ],
  tasks: [
    { id: uuidv4(), title: 'Finish SE Assignment 2 draft', time: 'By 5 PM', done: false, priority: 'high' },
    { id: uuidv4(), title: 'Email professor about extension', time: 'Anytime', done: true, priority: 'medium' },
    { id: uuidv4(), title: 'Buy groceries', time: 'Evening', done: false, priority: 'low' },
  ],
  events: [
    { id: uuidv4(), title: 'Database Lab', startTime: '10:00 AM', endTime: '12:00 PM', color: 'blue' },
    { id: uuidv4(), title: 'Study Group', startTime: '2:00 PM', endTime: '4:00 PM', description: 'Library 3rd floor', color: 'amber' },
  ],
  globalChatHistory: []
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('studentos-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      } catch (e) {
        console.error('Failed to parse state', e);
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('studentos-state', JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setState(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  };

  const addModule = (title: string, code: string, color: Module['color']) => {
    updateState(prev => ({
      ...prev,
      modules: [...prev.modules, { id: uuidv4(), title, code, color, files: [], chatHistory: [] }]
    }));
  };

  const toggleTask = (taskId: string) => {
    updateState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    }));
  };

  const addTask = (title: string, priority: 'high' | 'medium' | 'low') => {
    updateState(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: uuidv4(), title, priority, done: false, time: 'Anytime' }]
    }));
  };

  return { state, updateState, addModule, toggleTask, addTask };
}
