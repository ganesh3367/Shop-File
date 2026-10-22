import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue, useSpring } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1];

/** Page wrapper: a two-panel curtain wipes in on exit and out on enter. */
export function Page({ children, className = '', label }) {
  return (
    <>
      <motion.div
        className="curtain"
        aria-hidden
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0, transition: { duration: 0.7, ease, delay: 0.05 } }}
        exit={{ scaleY: 0 }}
        style={{ originY: 0 }}
      >
        {label && <span className="curtain__label">{label}</span>}
      </motion.div>
      <motion.div
        className="curtain"
        aria-hidden
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1, transition: { duration: 0.55, ease } }}
        style={{ originY: 1 }}
      />
      <motion.main
        className={`page ${className}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease, delay: 0.25 } }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
      >
        {children}
      </motion.main>
    </>
  );
}

/** Splits a string into words that slide up from behind a mask. */
export function SplitText({ text, as: Tag = 'h2', className = '', delay = 0, stagger = 0.06, trigger = true }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const show = inView && trigger;
  const words = text.split(' ');
  return (
    <Tag ref={ref} className={`split ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span className="split__mask" key={i} aria-hidden>
          <motion.span
            className="split__word"
            initial={{ y: '110%', rotate: 4 }}
            animate={show ? { y: '0%', rotate: 0 } : undefined}
            transition={{ duration: 0.9, ease, delay: delay + i * stagger }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </Tag>
  );
}

/** Generic fade-up on scroll into view. */
export function Reveal({ children, delay = 0, y = 40, className = '', as = 'div', ...rest }) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.9, ease, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Image that unveils with a clip-path wipe and settles from a slight zoom. */
export function ImageReveal({ src, alt, className = '', delay = 0, ...rest }) {
  return (
    <motion.div
      className={`img-reveal ${className}`}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1.2, ease, delay }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        initial={{ scale: 1.3 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease, delay }}
        {...rest}
      />
    </motion.div>
  );
}

/** Element drifts toward the pointer while hovered, then springs back. */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 15, mass: 0.2 });
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 15, mass: 0.2 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} className={`magnetic ${className}`} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  );
}

/** Animated number that counts up once visible. */
export function Counter({ to, suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration, ease, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/** Infinite horizontal ticker. Speeds up while hovered via CSS. */
export function Marquee({ items, reverse = false }) {
  const row = [...items, ...items];
  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''}`} aria-hidden>
      <div className="marquee__track">
        {row.map((t, i) => (
          <span className="marquee__item" key={i}>
            {t}
            <span className="marquee__star">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
