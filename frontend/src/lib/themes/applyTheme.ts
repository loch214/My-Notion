import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  themeDefinitions,
  themesById,
} from './definitions';
import type { ThemeId, ThemeTokens } from './types';

function setVars(root: HTMLElement, tokens: ThemeTokens) {
  const map: Record<string, string> = {
    '--bg-primary': tokens.bgPrimary,
    '--bg-secondary': tokens.bgSecondary,
    '--surface': tokens.surface,
    '--card': tokens.card,
    '--border': tokens.border,
    '--text-primary': tokens.textPrimary,
    '--text-secondary': tokens.textSecondary,
    '--accent': tokens.accent,
    '--accent-soft': tokens.accentSoft,
    '--glow': tokens.glow,
    '--surface-low': tokens.surfaceLow,
    '--surface-med': tokens.surfaceMed,
    '--surface-high': tokens.surfaceHigh,
    '--border-focus': tokens.borderFocus,
    '--text': tokens.textPrimary,
    '--muted': tokens.textSecondary,
    '--accent-2': tokens.accent2,
    '--on-accent': tokens.onAccent,
    '--shadow': tokens.shadow,
    '--glow-top': tokens.glowTop,
    '--glow-bottom': tokens.glowBottom,
    '--sidebar-border': tokens.sidebarBorder,
    '--sidebar-highlight': tokens.sidebarHighlight,
    '--main-panel-border': tokens.mainPanelBorder,
    '--scrollbar-thumb': tokens.scrollbarThumb,
    '--gradient-text-start': tokens.gradientTextStart,
    '--gradient-text-end': tokens.gradientTextEnd,
    '--spotlight-hover': tokens.spotlightHover,
    '--nav-glass-bg': tokens.navGlassBg,
    '--nav-glass-border': tokens.navGlassBorder,
    '--accent-glow': tokens.accentGlow,
    '--app-bg': tokens.bgPrimary,
    '--app-bg-soft': tokens.bgSecondary,
  };

  for (const [key, value] of Object.entries(map)) {
    root.style.setProperty(key, value);
  }
}

export function isThemeId(value: string): value is ThemeId {
  return value in themesById;
}

export function applyTheme(themeId: ThemeId): void {
  const theme = themesById[themeId] ?? themesById[DEFAULT_THEME_ID];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  setVars(root, theme.tokens);
}

export function loadStoredThemeId(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isThemeId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID;
}

export function initThemeFromStorage(): ThemeId {
  const id = loadStoredThemeId();
  applyTheme(id);
  return id;
}

export { DEFAULT_THEME_ID, THEME_STORAGE_KEY };
