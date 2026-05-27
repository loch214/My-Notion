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
  const searchIsExpanded = isSearchOpen || searchQuery.trim().length > 0;
  const [searchPopoverStyle, setSearchPopoverStyle] = useState<CSSProperties | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [notificationsPopoverStyle, setNotificationsPopoverStyle] = useState<CSSProperties | null>(null);

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

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const inButton = notificationsButtonRef.current?.contains(target) ?? false;
      const inPopover = notificationsPopoverRef.current?.contains(target) ?? false;
      const inPopoverPath = notificationsPopoverRef.current ? path.includes(notificationsPopoverRef.current) : false;
      if (!inButton && !inPopover) {
        if (inPopoverPath) return;
        onNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen, onNotificationsOpen]);

  const notificationsPopover =
    isNotificationsOpen && notificationsPopoverStyle
      ? createPortal(
          <div ref={notificationsPopoverRef} style={notificationsPopoverStyle} className="fixed z-[220]">
            <motion.div
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-high)]/95 shadow-2xl backdrop-blur-xl"
            >
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Notifications · {notificationItems.length}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkAllNotificationsRead();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)] disabled:text-[color:var(--muted)]"
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
                      'flex w-full items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-white/5',
                      item.isRead ? 'opacity-65' : ''
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]', item.kind === 'event' ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]' : 'bg-[color:var(--surface-med)] text-[color:var(--muted)]')}>
                          {item.kind}
                        </span>
                        <span className="text-xs text-[color:var(--muted)]">{item.detail}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{item.subtitle}</p>
                    </div>
                    <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', item.kind === 'event' ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border-focus)]')} />
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[color:var(--muted)]">No notifications right now.</div>
              )}
            </div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

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
                      <span className="text-sm font-semibold text-[color:var(--text)]">{result.title}</span>
                      <p className="truncate text-sm text-[color:var(--muted)]">{result.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[color:var(--accent)]">
                      {result.actionLabel}
                    </span>
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

  return (
    <div className="flex w-full flex-col px-4 pt-[var(--workspace-nav-inset-top)] pb-[var(--workspace-nav-gap)] sm:px-6">
      <header
        className={cn(
          'relative z-[120] mx-auto grid h-[var(--workspace-nav-bar)] w-full max-w-[1400px] items-center gap-3 rounded-full px-3 sm:px-4',
          'border border-[color:var(--nav-glass-border)] bg-[color:var(--nav-glass-bg)] shadow-[0_6px_18px_rgba(0,0,0,0.28),inset_0_1px_0_var(--spotlight-hover)]',
          'backdrop-blur-md backdrop-saturate-150',
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
          <button
            type="button"
            ref={notificationsButtonRef}
            onClick={onOpenNotifications}
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

          {notificationsPopover}

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
