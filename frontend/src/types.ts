export interface Module {
  id: string;
  code: string;
  title: string;
  color: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose';
  files: UploadedFile[];
  chatHistory: ChatMessage[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url?: string;
  geminiFileUri?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
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
  color: 'blue' | 'amber' | 'purple';
}

export interface AppState {
  modules: Module[];
  tasks: Task[];
  events: Event[];
  globalChatHistory: ChatMessage[];
}
