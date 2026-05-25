import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyTheme, initThemeFromStorage } from '../lib/themes/applyTheme';
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  themeDefinitions,
  themesById,
} from '../lib/themes/definitions';
import type { ThemeDefinition, ThemeId } from '../lib/themes/types';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  themes: ThemeDefinition[];
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => initThemeFromStorage());

  useLayoutEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    applyTheme(id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: themesById[themeId] ?? themesById[DEFAULT_THEME_ID],
      themes: themeDefinitions,
      setTheme,
    }),
    [themeId, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export { DEFAULT_THEME_ID };
