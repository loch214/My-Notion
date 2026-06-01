export type AIProvider = 'gemini' | 'groq';

export type AIModelId = 'llama-3.3-70b-versatile' | 'gemini-2.5-flash' | 'gemini-3.1-pro';

export interface AIModelOption {
  id: AIModelId;
  label: string;
  provider: AIProvider;
  badge: string;
}

export const AI_MODELS: AIModelOption[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'groq', badge: 'Groq Fast' },
  { id: 'gemini-2.5-flash', label: 'Gemini Flash', provider: 'gemini', badge: 'Fast · Free' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'gemini', badge: 'Deep' },
];

export const DEFAULT_AI_MODEL: AIModelId = 'llama-3.3-70b-versatile';

export function isAIModelId(value: unknown): value is AIModelId {
  return typeof value === 'string' && AI_MODELS.some((model) => model.id === value);
}

export function readStoredAIModel(storageKey: string, fallback: AIModelId = DEFAULT_AI_MODEL): AIModelId {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = localStorage.getItem(storageKey);
    return isAIModelId(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredAIModel(storageKey: string, model: AIModelId) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, model);
  } catch {
    // ignore storage failures
  }
}

