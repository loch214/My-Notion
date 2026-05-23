import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, Module, Task, Event } from '../models.js';

const router = express.Router();

const WORKSPACE_ID = 'default-user-workspace';

// Helper to get or create workspace
async function getOrCreateWorkspace() {
  let workspace = await Workspace.findOne({ id: WORKSPACE_ID });
  if (!workspace) {
    workspace = new Workspace({
      id: WORKSPACE_ID,
      modules: [],
      tasks: [],
      events: [],
      globalChat: { id: uuidv4(), messages: [] },
    });
    await workspace.save();
  }
  return workspace;
}

// ===== MODULES =====
router.get('/modules', async (req, res) => {
  try {
    const workspace = await getOrCreateWorkspace();
    res.json(workspace.modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

router.post('/modules', async (req, res) => {
  try {
    const { title, code, color } = req.body;
    const workspace = await getOrCreateWorkspace();

    const module = {
      id: uuidv4(),
      title,
      code,
      color: color || 'blue',
      files: [],
      chatHistory: [],
    };

    workspace.modules.push(module as any);
    await workspace.save();
    res.json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

router.patch('/modules/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const updates = req.body;
    const workspace = await getOrCreateWorkspace();

    const moduleIndex = workspace.modules.findIndex((m: any) => m.id === moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ error: 'Module not found' });
    }

    Object.assign(workspace.modules[moduleIndex], updates, { updatedAt: new Date() });
    await workspace.save();
    res.json(workspace.modules[moduleIndex]);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

router.delete('/modules/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const workspace = await getOrCreateWorkspace();

    const moduleIndex = workspace.modules.findIndex((m: any) => m.id === moduleId);
    if (moduleIndex > -1) {
      (workspace.modules as any).splice(moduleIndex, 1);
    }
    await workspace.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// ===== TASKS =====
router.get('/tasks', async (req, res) => {
  try {
    const workspace = await getOrCreateWorkspace();
    res.json(workspace.tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, priority } = req.body;
    const workspace = await getOrCreateWorkspace();

    const task = {
      id: uuidv4(),
      title,
      done: false,
      priority: priority || 'medium',
      time: '09:00 AM',
    };

    workspace.tasks.push(task as any);
    await workspace.save();
    res.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const workspace = await getOrCreateWorkspace();

    const taskIndex = workspace.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    Object.assign(workspace.tasks[taskIndex], updates, { updatedAt: new Date() });
    await workspace.save();
    res.json(workspace.tasks[taskIndex]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const workspace = await getOrCreateWorkspace();

    const taskIndex = workspace.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex > -1) {
      (workspace.tasks as any).splice(taskIndex, 1);
    }
    await workspace.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ===== EVENTS =====
router.get('/events', async (req, res) => {
  try {
    const workspace = await getOrCreateWorkspace();
    res.json(workspace.events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { title, startTime, endTime, color, description } = req.body;
    const workspace = await getOrCreateWorkspace();

    const event = {
      id: uuidv4(),
      title,
      startTime,
      endTime,
      color: color || 'blue',
      description,
    };

    workspace.events.push(event as any);
    await workspace.save();
    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ===== GLOBAL CHAT =====
router.get('/chat/global', async (req, res) => {
  try {
    const workspace = await getOrCreateWorkspace();
    res.json(workspace.globalChat?.messages || []);
  } catch (error) {
    console.error('Error fetching global chat:', error);
    res.status(500).json({ error: 'Failed to fetch global chat' });
  }
});

router.post('/chat/global/message', async (req, res) => {
  try {
    const { id, role, text, timestamp } = req.body;
    const workspace = await getOrCreateWorkspace();

    if (!workspace.globalChat) {
      (workspace.globalChat as any) = { id: uuidv4(), messages: [] };
    }

    (workspace.globalChat?.messages as any).push({ id, role, text, timestamp });
    await workspace.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving global chat message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ===== MODULE CHAT =====
router.post('/chat/module/:moduleId/message', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { id, role, text, timestamp } = req.body;
    const workspace = await getOrCreateWorkspace();

    const moduleIndex = workspace.modules.findIndex((m: any) => m.id === moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ error: 'Module not found' });
    }

    workspace.modules[moduleIndex].chatHistory.push({ id, role, text, timestamp } as any);
    await workspace.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving module chat message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ===== FULL WORKSPACE STATE =====
router.get('/workspace', async (req, res) => {
  try {
    const workspace = await getOrCreateWorkspace();
    res.json({
      modules: workspace.modules,
      tasks: workspace.tasks,
      events: workspace.events,
      globalChatHistory: workspace.globalChat?.messages || [],
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

export default router;
