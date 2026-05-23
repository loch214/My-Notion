export type AIProvider = 'gemini' | 'claude';

export type AIModelId = 'gemini-2.5-flash' | 'gemini-3.1-pro' | 'claude-sonnet-4-6';

export interface AIModelOption {
  id: AIModelId;
  label: string;
  provider: AIProvider;
  badge: string;
}

export const AI_MODELS: AIModelOption[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini Flash', provider: 'gemini', badge: 'Fast · Free' },
  { id: 'gemini-3.1-pro', label: 'Gemini Pro', provider: 'gemini', badge: 'Deep' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet', provider: 'claude', badge: 'Balanced' },
];

export const DEFAULT_AI_MODEL: AIModelId = 'gemini-2.5-flash';
