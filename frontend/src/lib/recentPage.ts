export type RecentTab = 'home' | 'academic' | 'personal' | 'calendar';

export interface RecentPage {
  label: string;
  tab: RecentTab;
  moduleId?: string | null;
  visitedAt: string;
}

const STORAGE_KEY = 'my_notion_recent_page';

export function saveRecentPage(page: Omit<RecentPage, 'visitedAt'>): void {
  const entry: RecentPage = { ...page, visitedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function loadRecentPage(): RecentPage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecentPage;
  } catch {
    return null;
  }
}
