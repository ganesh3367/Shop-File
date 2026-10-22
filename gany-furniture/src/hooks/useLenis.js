import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

// Buttery inertial scrolling. Skipped entirely for users who prefer reduced motion.
export function useLenis() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // lerp-based smoothing gives a softer, more natural glide than a fixed duration.
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true });
    ref.current = lenis;
    window.__lenis = lenis;

    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      ref.current = null;
      window.__lenis = null;
    };
  }, []);

  return ref;
}

// Lock page scroll while overlays (drawer, modal, palette) are open.
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    window.__lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      window.__lenis?.start();
    };
  }, [locked]);
}
