import mongoose from 'mongoose';

// Chat Message Schema (used in both global and module chats)
const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  history: [chatMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// File Schema (for uploaded files)
const fileSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  geminiFileUri: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

// Module Schema
const moduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  code: { type: String, required: true },
  color: { type: String, enum: ['blue', 'amber', 'emerald', 'purple', 'rose'], default: 'blue' },
  files: [fileSchema],
  chatHistory: [chatMessageSchema],
  chatSessions: [chatSessionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Task Schema
const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  dueDate: { type: String },
  moduleId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Event Schema
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  color: { type: String, enum: ['blue', 'amber', 'purple', 'emerald', 'rose'], default: 'blue' },
  description: { type: String },
  reminderMinutes: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

// Global Chat History Schema
const globalChatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  messages: [chatMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// User/Workspace Schema (aggregates all user data)
const workspaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, default: 'My Workspace' },
  modules: [moduleSchema],
  tasks: [taskSchema],
  events: [eventSchema],
  readNotificationIds: [{ type: String }],
  globalChat: globalChatSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Export models
export const Module = mongoose.model('Module', moduleSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Event = mongoose.model('Event', eventSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const Workspace = mongoose.model('Workspace', workspaceSchema);
