export interface Module {
  id: string;
  code: string;
  title: string;
  color: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose';
  files: UploadedFile[];
  chatHistory: ChatMessage[];
  chatSessions?: ChatSession[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url?: string;
  geminiFileUri?: string;
  extractedText?: string;
}

export interface ChatAttachment {
  name: string;
  type: string;
  data: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  moduleId?: string;
  done: boolean;
}

export interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  color: 'blue' | 'amber' | 'purple' | 'emerald' | 'rose';
}

export interface AppState {
  modules: Module[];
  tasks: Task[];
  events: Event[];
  globalChatHistory: ChatMessage[];
}
