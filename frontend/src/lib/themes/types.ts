export type ThemeId =
  | 'nebula-blue'
  | 'midnight-violet'
  | 'emerald-pulse'
  | 'crimson-noir'
  | 'sunset-synthwave'
  | 'obsidian-gold'
  | 'aurora-dream';

export interface ThemeTokens {
  bgPrimary: string;
  bgSecondary: string;
  surface: string;
  surfaceLow: string;
  surfaceMed: string;
  surfaceHigh: string;
  card: string;
  border: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  onAccent: string;
  glow: string;
  shadow: string;
  glowTop: string;
  glowBottom: string;
  sidebarBorder: string;
  sidebarHighlight: string;
  mainPanelBorder: string;
  scrollbarThumb: string;
  gradientTextStart: string;
  gradientTextEnd: string;
  spotlightHover: string;
  navGlassBg: string;
  navGlassBorder: string;
  accentGlow: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  /** Four swatches for the settings preview card */
  preview: [string, string, string, string];
}
