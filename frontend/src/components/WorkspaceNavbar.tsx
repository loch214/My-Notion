import { RefObject, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Menu, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { WorkspaceNotificationItem } from '../lib/notifications';
import { Button } from './ui/Button';

export interface SearchResultItem {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  actionLabel: string;
}

interface WorkspaceNavbarProps {
  activeBreadcrumb: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearchOpen: boolean;
  onSearchOpen: (open: boolean) => void;
  searchResults: SearchResultItem[];
  onRunSearchResult: (id: string) => void;
  searchRef: RefObject<HTMLDivElement | null>;
  upcomingCount: number;
  onOpenNotifications: () => void;
  notificationItems: WorkspaceNotificationItem[];
  onOpenNotificationItem: (item: WorkspaceNotificationItem) => void;
  onMarkAllNotificationsRead: () => void;
  isNotificationsOpen: boolean;
  onNotificationsOpen: (open: boolean) => void;
  onOpenMobileSidebar: () => void;
  onGoLanding: () => void;
  onOpenAi: () => void;
}

export function WorkspaceNavbar({
  activeBreadcrumb,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onSearchOpen,
  searchResults,
  onRunSearchResult,
  searchRef,
  upcomingCount,
  onOpenNotifications,
  notificationItems,
  onOpenNotificationItem,
  onMarkAllNotificationsRead,
  isNotificationsOpen,
  onNotificationsOpen,
  onOpenMobileSidebar,
  onGoLanding,
  onOpenAi,
}: WorkspaceNavbarProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [searchPopoverStyle, setSearchPopoverStyle] = useState<CSSProperties | null>(null);
  const [notificationsPopoverStyle, setNotificationsPopoverStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!isSearchOpen || !searchRef.current) {
      setSearchPopoverStyle(null);
      return;
    }

    const updateStyle = () => {
      const rect = searchRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSearchPopoverStyle({ position: 'fixed', left: rect.left, top: rect.bottom + 10, width: rect.width, zIndex: 220 });
    };

    updateStyle();
    window.addEventListener('resize', updateStyle);
    window.addEventListener('scroll', updateStyle, true);
    
    const observer = new ResizeObserver(updateStyle);
    if (searchRef.current) {
      observer.observe(searchRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateStyle);
      window.removeEventListener('scroll', updateStyle, true);
      observer.disconnect();
    };
  }, [isSearchOpen, searchRef]);

  useEffect(() => {
    if (!isNotificationsOpen || !notificationsButtonRef.current) {
      setNotificationsPopoverStyle(null);
      return;
    }

    const updateStyle = () => {
      const rect = notificationsButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setNotificationsPopoverStyle({
        position: 'fixed',
        right: Math.max(12, window.innerWidth - rect.right),
        top: rect.bottom + 10,
        width: Math.min(26 * 16, Math.max(18 * 16, window.innerWidth - rect.left - 12)),
        zIndex: 220,
      });
    };

    updateStyle();
    window.addEventListener('resize', updateStyle);
    window.addEventListener('scroll', updateStyle, true);
    return () => {
      window.removeEventListener('resize', updateStyle);
      window.removeEventListener('scroll', updateStyle, true);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onNotificationsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isNotificationsOpen, onNotificationsOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const searchResultsPopover =
    isSearchOpen && searchPopoverStyle
      ? createPortal(
          <motion.div
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={searchPopoverStyle}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-high)]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Search · {searchResults.length} results</p>
            </div>
            <div className="max-h-[20rem] overflow-y-auto p-1.5">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onRunSearchResult(result.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[color:var(--text)]">{result.title}</span>
                      <p className="truncate text-sm text-[color:var(--muted)]">{result.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[color:var(--accent)]">{result.actionLabel}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[color:var(--muted)]">No matches found.</div>
              )}
            </div>
          </motion.div>,
          document.body
        )
      : null;

  const notificationsPopover =
    isNotificationsOpen && notificationsPopoverStyle
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[210] bg-transparent" onMouseDown={() => onNotificationsOpen(false)} aria-hidden />
            <div style={notificationsPopoverStyle} className="fixed z-[220]">
              <motion.div
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-high)]/95 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-4 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Notifications · {notificationItems.length}</p>
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onMarkAllNotificationsRead();
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex h-8 min-w-[7.5rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-med)] px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--text)] transition-all duration-150 ease hover:bg-[color:var(--surface-high)] active:scale-[0.98]"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-[22rem] overflow-y-auto p-1.5">
                  {notificationItems.length > 0 ? (
                    notificationItems.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onOpenNotificationItem(item);
                          onNotificationsOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150 ease',
                          item.isRead
                            ? 'border-[color:var(--border)] bg-[color:var(--surface-med)]/60 opacity-70 hover:bg-[color:var(--surface-med)]/80'
                            : 'border-[color:var(--border-focus)]/20 bg-[color:var(--surface-med)] hover:bg-[color:var(--surface-med)]/80'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]',
                                item.isRead ? 'bg-[color:var(--surface-high)] text-[color:var(--muted)]' : 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
                              )}
                            >
                              {item.kind}
                            </span>
                            <span className="text-xs text-[color:var(--muted)]">{item.detail}</span>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                          <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{item.subtitle}</p>
                        </div>
                        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', item.isRead ? 'bg-[color:var(--border-focus)]' : 'bg-[color:var(--accent)]')} />
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-[color:var(--muted)]">No notifications right now.</div>
                  )}
                </div>
              </motion.div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <header className="workspace-navbar relative mx-[var(--workspace-edge-inset)] mt-[var(--workspace-nav-inset-top)] flex h-[var(--workspace-nav-bar)] items-center justify-between gap-3 rounded-[2rem] border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-med)]/78 px-4 shadow-[0_8px_30px_rgba(4,10,28,0.3)] backdrop-blur-md sm:px-5 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3">
      <button type="button" onClick={onGoLanding} className="flex min-w-0 items-center gap-2 rounded-full px-1.5 py-1 text-left hover:bg-white/5 md:max-w-full md:justify-self-start">
        <div className="min-w-0 flex items-center gap-2 text-base">
          <span className="truncate font-semibold text-[color:var(--text)]">My-Notion</span>
          <span className="text-[color:var(--muted)]">/</span>
          <span className="truncate text-[color:var(--muted)]">{activeBreadcrumb}</span>
        </div>
      </button>

      <div className="hidden items-center justify-center md:flex md:justify-self-center">
        <div 
          ref={searchRef} 
          className={cn(
            "relative transition-all duration-300 ease-in-out",
            isSearchOpen ? "w-[400px]" : "w-[240px]"
          )}
        >
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-low)]/80 px-3 py-1.5">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={() => onSearchOpen(true)}
              placeholder="Search anything..."
              className="w-full bg-transparent text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
            />
            <button 
              type="button" 
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)]" 
              onClick={() => onSearchOpen(!isSearchOpen)}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
          {searchResultsPopover}
        </div>
      </div>

      <div className="flex items-center gap-2 md:justify-self-end">
        <button type="button" onClick={onOpenMobileSidebar} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-low)]/75 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)] md:hidden" aria-label="Open sidebar">
          <Menu className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onSearchOpen(!isSearchOpen)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-low)]/75 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)] md:hidden" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>
        <button ref={notificationsButtonRef} type="button" onClick={onOpenNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-low)]/75 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)]" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {upcomingCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">{upcomingCount}</span> : null}
        </button>
        <button type="button" onClick={onOpenAi} className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--nav-glass-border)] bg-gradient-to-r from-[color:var(--accent)]/85 to-[color:var(--accent-2)]/85 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(99,102,241,0.35)] hover:brightness-110">
          <Sparkles className="h-4 w-4" />
          Say Hello
        </button>
      </div>

      {isSearchOpen && (
        <div className="absolute inset-x-0 top-full z-50 px-4 py-3 md:hidden">
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--nav-glass-border)] bg-[color:var(--surface-low)]/95 px-3 py-2 shadow-2xl">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={() => onSearchOpen(true)}
                placeholder="Search anything..."
                className="w-full bg-transparent text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
              />
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)]"
                onClick={() => onSearchOpen(false)}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {searchResultsPopover}
        </div>
      )}

      {notificationsPopover}
    </header>
  );
}
