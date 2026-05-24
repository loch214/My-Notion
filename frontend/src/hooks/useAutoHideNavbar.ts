import { RefObject, useEffect, useRef } from 'react';

const SCROLL_DELTA = 8;
const TOP_LOCK_PX = 16;

export function useAutoHideNavbar(
  enabled: boolean,
  scrollRootRef: RefObject<HTMLElement | null>,
  setVisible: (visible: boolean) => void,
  resetKey?: string
) {
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }

    const isScrollable = (el: HTMLElement) =>
      el.scrollHeight > el.clientHeight + 2;

    const onScroll = () => {
      const el = scrollRootRef.current;
      if (!el) return;

      if (!isScrollable(el)) {
        setVisible(true);
        lastScrollTopRef.current = 0;
        return;
      }

      const scrollTop = el.scrollTop;
      const diff = scrollTop - lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (scrollTop < TOP_LOCK_PX) {
        setVisible(true);
        return;
      }

      if (diff > SCROLL_DELTA) {
        setVisible(false);
      } else if (diff < -SCROLL_DELTA) {
        setVisible(true);
      }
    };

    const el = scrollRootRef.current;
    if (el) {
      lastScrollTopRef.current = el.scrollTop;
      if (!isScrollable(el) || el.scrollTop < TOP_LOCK_PX) {
        setVisible(true);
      }
    }

    el?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el?.removeEventListener('scroll', onScroll);
    };
  }, [enabled, scrollRootRef, setVisible, resetKey]);
}
