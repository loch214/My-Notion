import { RefObject, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Menu, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
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
  notificationsRef: RefObject<HTMLDivElement | null>;
  upcomingCount: number;
  isNotificationsOpen: boolean;
  onToggleNotifications: () => void;
  notifications: Array<{ id: string; title: string; subtitle: string; onSelect: () => void }>;
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
  notificationsRef,
  upcomingCount,
  isNotificationsOpen,
  onToggleNotifications,
  notifications,
  onOpenMobileSidebar,
  onGoLanding,
  onOpenAi,
}: WorkspaceNavbarProps) {
  const searchIsExpanded = isSearchOpen || searchQuery.trim().length > 0;
  const [searchPopoverStyle, setSearchPopoverStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!isSearchOpen || !searchRef.current) {
      setSearchPopoverStyle(null);
      return;
    }

    const updateStyle = () => {
      const rect = searchRef.current?.getBoundingClientRect();
      if (!rect) return;

      setSearchPopoverStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 10,
        width: rect.width,
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
  }, [isSearchOpen, searchRef]);

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
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Search · {searchResults.length} results
              </p>
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
                      <span className="text-xs font-semibold text-[color:var(--text)]">{result.title}</span>
                      <p className="truncate text-[11px] text-[color:var(--muted)]">{result.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-[color:var(--accent)]">
                      {result.actionLabel}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-xs text-[color:var(--muted)]">No matches found.</div>
              )}
            </div>
          </motion.div>,
          document.body
        )
      : null;

  return (
    <div className="flex w-full flex-col px-4 pt-[var(--workspace-nav-inset-top)] pb-[var(--workspace-nav-gap)] sm:px-6">
      <header
        className={cn(
          'relative z-[120] mx-auto grid h-[var(--workspace-nav-bar)] w-full max-w-[1400px] items-center gap-3 rounded-full px-3 sm:px-4',
          'border border-[color:var(--nav-glass-border)] bg-[color:var(--nav-glass-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_var(--spotlight-hover)]',
          'backdrop-blur-2xl backdrop-saturate-150',
          'max-lg:grid-cols-[auto_1fr_auto] lg:grid-cols-[minmax(0,1fr)_minmax(12rem,28rem)_minmax(0,1fr)]'
        )}
      >
        <div className="flex min-w-0 items-center justify-start gap-2 pl-1">
          <button
            onClick={onOpenMobileSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)] md:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onGoLanding}
            className="flex min-w-0 max-w-full items-center gap-2.5 rounded-full py-1 pr-2 transition hover:bg-white/[0.06]"
            aria-label="Go to landing page"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)] shadow-[0_0_20px_var(--accent-glow)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden min-w-0 items-center gap-2 sm:inline-flex">
              <span className="shrink-0 font-heading text-base font-semibold text-[color:var(--text)]">
                My-Notion
              </span>
              <span className="shrink-0 text-white/20">/</span>
              <span className="truncate text-sm text-[color:var(--muted)]">{activeBreadcrumb}</span>
            </span>
          </button>
        </div>

        <div
          ref={searchRef}
          className="relative w-full justify-self-center"
          onMouseDown={() => onSearchOpen(true)}
          onClick={() => onSearchOpen(true)}
        >
          <div
            className={cn(
              'relative mx-auto flex h-9 items-center rounded-full border border-white/[0.1] bg-black/20 pl-3 pr-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 ease focus-within:border-[color:var(--border-focus)] focus-within:bg-black/30',
              searchIsExpanded ? 'w-full max-w-[28rem]' : 'w-full max-w-[12rem] sm:max-w-[14rem]'
            )}
          >
            <input
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onSearchOpen(true);
              }}
              onFocus={() => onSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults[0]) {
                  onRunSearchResult(searchResults[0].id);
                }
              }}
              placeholder="Search..."
              className="h-full w-full border-0 bg-transparent p-0 text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
            />
            <button
              type="button"
              onClick={() => {
                if (searchQuery.trim() && searchResults[0]) {
                  onRunSearchResult(searchResults[0].id);
                  return;
                }
                onSearchOpen(true);
              }}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[color:var(--muted)] hover:text-[color:var(--text)]"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {searchResultsPopover}
        </div>

        <div className="flex items-center justify-end gap-2 pr-1">
          <div ref={notificationsRef} className="relative z-[120]">
            <button
              type="button"
              onClick={onToggleNotifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-black/20 text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--text)]"
              aria-label="Notifications"
            >
              <Bell className="h-[1.125rem] w-[1.125rem]" />
              {upcomingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[9px] font-bold text-[color:var(--on-accent)]">
                  {upcomingCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-[130] w-[20rem] overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-high)]/95 shadow-2xl backdrop-blur-xl"
                >
                  <div className="border-b border-[color:var(--border)] px-4 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Notifications</p>
                  </div>
                  <div className="max-h-[20rem] overflow-y-auto p-1.5">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onSelect}
                          className="flex w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{item.title}</p>
                            <p className="text-[11px] text-[color:var(--muted)]">{item.subtitle}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-xs text-[color:var(--muted)]">No upcoming items.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAi}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="h-10 shrink-0 px-4 text-sm shadow-[0_4px_24px_var(--accent-glow)]"
          >
            Say Hello
          </Button>
        </div>
      </header>
    </div>
  );
}
