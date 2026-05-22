export type AIProvider = 'gemini' | 'claude';

export type AIModelId = 'gemini-2.5-flash' | 'gemini-3.1-pro' | 'claude-sonnet-4' | 'claude-opus-4';

export interface AIModelOption {
  id: AIModelId;
  label: string;
  provider: AIProvider;
  badge: string;
}

export const AI_MODELS: AIModelOption[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini Flash', provider: 'gemini', badge: 'Fast' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'gemini', badge: 'Deep' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'claude', badge: 'Balanced' },
  { id: 'claude-opus-4', label: 'Claude Opus 4', provider: 'claude', badge: 'Premium' },
];

export const DEFAULT_AI_MODEL: AIModelId = 'gemini-2.5-flash';
