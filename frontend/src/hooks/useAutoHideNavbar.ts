import { useEffect, useRef } from 'react';

/** Scroll down this many px (accumulated) before hiding */
const HIDE_AFTER_PX = 10;
/** Scroll up this many px (accumulated) before showing */
const SHOW_AFTER_PX = 6;

/**
 * Hides the workspace navbar when the user scrolls down inside `scrollRoot`,
 * shows it when scrolling up or when scrolled back to the top.
 * Uses accumulated delta so trackpad / wheel scrolling feels the same on every page.
 */
export function useAutoHideNavbar(
  enabled: boolean,
  scrollRoot: HTMLElement | null,
  setVisible: (visible: boolean) => void,
  resetKey?: string
) {
  const lastYRef = useRef(0);
  const visibleRef = useRef(true);
  const downAccumRef = useRef(0);
  const upAccumRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const isAtBottom = (el: HTMLElement) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
  };

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const applyVisible = (next: boolean) => {
      if (visibleRef.current === next) return;
      visibleRef.current = next;
      setVisible(next);
      if (next) {
        downAccumRef.current = 0;
      } else {
        upAccumRef.current = 0;
      }
    };

    const syncFromScroll = (showAtTop = true) => {
      const el = scrollRoot;
      if (!el) return;
      const y = el.scrollTop;
      lastYRef.current = y;
      downAccumRef.current = 0;
      upAccumRef.current = 0;
      if (showAtTop && y <= 1) {
        applyVisible(true);
      }
    };

    const resetForNavigation = () => {
      const el = scrollRoot;
      if (el) {
        el.scrollTop = 0;
      }
      lastYRef.current = 0;
      downAccumRef.current = 0;
      upAccumRef.current = 0;
      applyVisible(true);
    };

    resetForNavigation();

    const tick = () => {
      const el = scrollRoot;
      if (!el) return;

      const currentY = el.scrollTop;
      const delta = currentY - lastYRef.current;
      lastYRef.current = currentY;

      if (currentY <= 1) {
        applyVisible(true);
        downAccumRef.current = 0;
        upAccumRef.current = 0;
        return;
      }

      if (isAtBottom(el)) {
        downAccumRef.current = 0;
        upAccumRef.current = 0;
        return;
      }

      if (delta > 0) {
        downAccumRef.current += delta;
        upAccumRef.current = 0;
        if (downAccumRef.current >= HIDE_AFTER_PX) {
          applyVisible(false);
        }
        return;
      }

      if (delta < 0) {
        upAccumRef.current += -delta;
        downAccumRef.current = 0;
        if (upAccumRef.current >= SHOW_AFTER_PX) {
          applyVisible(true);
        }
      }
    };

    const scheduleTick = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        tick();
      });
    };

    const el = scrollRoot;
    el?.addEventListener('scroll', scheduleTick, { passive: true });

    const onWheel = (e: WheelEvent) => {
      if (!scrollRoot || e.deltaY === 0) return;
      if (e.deltaY > 0) {
        downAccumRef.current += e.deltaY;
        upAccumRef.current = 0;
        if (downAccumRef.current >= HIDE_AFTER_PX && scrollRoot.scrollTop > 1 && !isAtBottom(scrollRoot)) {
          applyVisible(false);
        }
      } else {
        upAccumRef.current += -e.deltaY;
        downAccumRef.current = 0;
        if (upAccumRef.current >= SHOW_AFTER_PX) {
          applyVisible(true);
        }
      }
      scheduleTick();
    };

    el?.addEventListener('wheel', onWheel, { passive: true });

    const resizeObserver =
      el &&
      new ResizeObserver(() => {
        syncFromScroll(false);
      });
    resizeObserver?.observe(el);

    return () => {
      el?.removeEventListener('scroll', scheduleTick);
      el?.removeEventListener('wheel', onWheel);
      resizeObserver?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, scrollRoot, setVisible, resetKey]);
}
