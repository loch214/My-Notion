import { useEffect, useRef } from 'react';

const SCROLL_DELTA_PX = 4;
const COOLDOWN_MS = 160;

export function useAutoHideNavbar(
  enabled: boolean,
  scrollRoot: HTMLElement | null,
  setVisible: (visible: boolean) => void,
  resetKey?: string
) {
  const lastYRef = useRef(0);
  const visibleRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);
  const lastToggleAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const applyVisible = (next: boolean) => {
      if (visibleRef.current === next) return;
      visibleRef.current = next;
      lastToggleAtRef.current = Date.now();
      setVisible(next);
    };

    const tick = () => {
      const el = scrollRoot;
      if (!el) return;

      const currentY = el.scrollTop;
      const delta = currentY - lastYRef.current;

      if (currentY <= 1) {
        applyVisible(true);
        lastYRef.current = currentY;
        return;
      }

      if (Date.now() - lastToggleAtRef.current < COOLDOWN_MS) {
        lastYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) < SCROLL_DELTA_PX) {
        lastYRef.current = currentY;
        return;
      }

      lastYRef.current = currentY;

      if (delta < 0) {
        applyVisible(true);
        return;
      }

      if (delta > 0) {
        applyVisible(false);
      }
    };

    const onScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        tick();
      });
    };

    const el = scrollRoot;
    if (el) {
      lastYRef.current = el.scrollTop;
      applyVisible(el.scrollTop <= 1);
    }

    el?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el?.removeEventListener('scroll', onScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, scrollRoot, setVisible, resetKey]);
}
