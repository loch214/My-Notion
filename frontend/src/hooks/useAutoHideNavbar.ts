import { useEffect, useRef } from 'react';

const SCROLL_DELTA = 8;
const TOP_LOCK_PX = 16;
const TOGGLE_LOCK_MS = 220;
const HIDE_DISTANCE_PX = 24;
const SHOW_DISTANCE_PX = 72;

export function useAutoHideNavbar(
  enabled: boolean,
  scrollRoot: HTMLElement | null,
  setVisible: (visible: boolean) => void,
  resetKey?: string
) {
  const lastScrollTopRef = useRef(0);
  const visibleRef = useRef(true);
  const lastToggleAtRef = useRef(0);
  const upDistanceRef = useRef(0);
  const downDistanceRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const isScrollable = (el: HTMLElement) =>
      el.scrollHeight > el.clientHeight + 2;

    const onScroll = () => {
      const el = scrollRoot;
      if (!el) return;

      if (!isScrollable(el)) {
        if (!visibleRef.current) {
          visibleRef.current = true;
          setVisible(true);
        }
        lastScrollTopRef.current = 0;
        upDistanceRef.current = 0;
        downDistanceRef.current = 0;
        return;
      }

      const scrollTop = el.scrollTop;
      const diff = scrollTop - lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;
      const now = Date.now();

      // Prevent immediate flip-flops caused by layout/padding shifts after a visibility toggle.
      if (now - lastToggleAtRef.current < TOGGLE_LOCK_MS) {
        return;
      }

      if (scrollTop < TOP_LOCK_PX) {
        if (!visibleRef.current) {
          visibleRef.current = true;
          setVisible(true);
        }
        upDistanceRef.current = 0;
        downDistanceRef.current = 0;
        return;
      }

      if (Math.abs(diff) < SCROLL_DELTA) return;

      if (diff > 0) {
        downDistanceRef.current += diff;
        upDistanceRef.current = 0;

        if (visibleRef.current && downDistanceRef.current >= HIDE_DISTANCE_PX) {
          visibleRef.current = false;
          lastToggleAtRef.current = now;
          downDistanceRef.current = 0;
          setVisible(false);
        }
        return;
      }

      upDistanceRef.current += -diff;
      downDistanceRef.current = 0;

      if (!visibleRef.current && upDistanceRef.current >= SHOW_DISTANCE_PX) {
        visibleRef.current = true;
        lastToggleAtRef.current = now;
        upDistanceRef.current = 0;
        setVisible(true);
      }
    };

    const el = scrollRoot;
    if (el) {
      lastScrollTopRef.current = el.scrollTop;
      upDistanceRef.current = 0;
      downDistanceRef.current = 0;
      if (!isScrollable(el) || el.scrollTop < TOP_LOCK_PX) {
        visibleRef.current = true;
        setVisible(true);
      }
    }

    el?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el?.removeEventListener('scroll', onScroll);
    };
  }, [enabled, scrollRoot, setVisible, resetKey]);
}
