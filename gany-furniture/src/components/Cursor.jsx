import { useEffect, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';

const INTERACTIVE = 'a, button, [role="button"], select, label, summary, .card__media';
const TEXT_FIELDS = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea';

/**
 * A quiet cursor: one small dot that tracks the pointer exactly (no trailing lag),
 * and softly grows over clickable things. Text fields get the normal I-beam back.
 * Only enabled for mouse/trackpad users who haven't asked for reduced motion.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState('default'); // default | hover | text | hidden
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    const ok = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(ok);
    if (!ok) return;
    document.documentElement.classList.add('has-cursor');

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target;
      setMode(t.closest?.(TEXT_FIELDS) ? 'text' : t.closest?.(INTERACTIVE) ? 'hover' : 'default');
    };
    const press = () => setDown(true);
    const release = () => setDown(false);
    const leave = () => setMode('hidden');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [x, y]);

  if (!enabled) return null;

  const size = mode === 'hover' ? 34 : 8;
  return (
    <motion.div
      className={`cursor cursor--${mode}`}
      style={{ x, y }}
      animate={{ width: size, height: size, scale: down ? 0.8 : 1, opacity: mode === 'text' || mode === 'hidden' ? 0 : 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      aria-hidden
    />
  );
}
