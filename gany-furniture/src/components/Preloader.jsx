import { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { ease } from './motion';

const WORDS = ['Comfort', 'Craft', 'Character', "Gany's"];

export default function Preloader({ onDone }) {
  const [count, setCount] = useState(0);
  const [word, setWord] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: 2.4,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
      onComplete: () => setTimeout(() => done.current(), 250),
    });
    const t = setInterval(() => setWord((w) => Math.min(w + 1, WORDS.length - 1)), 600);
    return () => {
      controls.stop();
      clearInterval(t);
    };
  }, []);

  return (
    <motion.div
      className="preloader"
      exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 1, ease } }}
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
    >
      <div className="preloader__word">
        <motion.span key={word} initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} transition={{ duration: 0.5, ease }}>
          {WORDS[word]}
        </motion.span>
      </div>
      <div className="preloader__bar">
        <motion.div className="preloader__fill" style={{ scaleX: count / 100 }} />
      </div>
      <div className="preloader__count">{String(count).padStart(3, '0')}</div>
      <div className="preloader__meta">Pune · Est. 2024</div>
    </motion.div>
  );
}
