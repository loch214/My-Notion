import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const UploadedFileSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: String, required: true },
  url: { type: String },
  geminiFileUri: { type: String },
});

const ModuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  title: { type: String, required: true },
  color: { type: String, enum: ['amber', 'blue', 'emerald', 'purple', 'rose'], required: true },
  files: [UploadedFileSchema],
  chatHistory: [ChatMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  time: { type: String, default: 'Anytime' },
  done: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const EventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  description: { type: String },
  color: { type: String, enum: ['blue', 'amber', 'purple'], default: 'blue' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Module = mongoose.model('Module', ModuleSchema);
export const Task = mongoose.model('Task', TaskSchema);
export const Event = mongoose.model('Event', EventSchema);
