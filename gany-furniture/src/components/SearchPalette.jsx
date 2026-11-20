import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, FileText, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice, sized } from '../data/products';
import { useCatalog } from '../context/CatalogContext';
import { useScrollLock } from '../hooks/useLenis';

const PAGES = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Seating collection', to: '/shop/seating' },
  { label: 'Tables collection', to: '/shop/tables' },
  { label: 'Lighting collection', to: '/shop/lighting' },
  { label: 'Our story', to: '/about' },
  { label: 'Careers', to: '/careers' },
  { label: 'Contact us', to: '/contact' },
  { label: 'Help centre & FAQ', to: '/help' },
  { label: 'Return policy', to: '/returns' },
  { label: 'Wishlist', to: '/wishlist' },
];

const POPULAR = ['sofa', 'pendant', 'dining', 'lounge', 'brass'];

// Lightweight fuzzy score: exact substring wins, otherwise every query char in order.
function score(text, q) {
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let i = 0;
  for (const c of t) if (c === q[i]) i++;
  return i === q.length ? 10 : 0;
}

export default function SearchPalette() {
  const { searchOpen, setSearchOpen } = useStore();
  const { products: PRODUCTS } = useCatalog();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  useScrollLock(searchOpen);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query)
      return [
        ...PRODUCTS.filter((p) => p.badge === 'Bestseller')
          .slice(0, 5)
          .map((p) => ({ kind: 'product', p })),
      ];
    const products = PRODUCTS.map((p) => ({ p, s: Math.max(score(p.name, query), score(`${p.type} ${p.category}`, query) - 20) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ p }) => ({ kind: 'product', p }));
    const pages = PAGES.filter((pg) => score(pg.label, query) > 0)
      .slice(0, 3)
      .map((pg) => ({ kind: 'page', pg }));
    return [...products, ...pages];
  }, [q, PRODUCTS]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (searchOpen) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const go = (r) => {
    if (!r) return;
    setSearchOpen(false);
    navigate(r.kind === 'product' ? `/product/${r.p.id}` : r.pg.to);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') setSearchOpen(false);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(results.length, 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % Math.max(results.length, 1));
    }
    if (e.key === 'Enter') go(results[active]);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="palette-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSearchOpen(false)}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKey}
          >
            <div className="palette__input">
              <Search size={20} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sofas, lamps, pages…"
                aria-label="Search"
              />
              <kbd>esc</kbd>
            </div>

            {!q && (
              <div className="palette__chips">
                <span className="muted small">Popular:</span>
                {POPULAR.map((t) => (
                  <button key={t} className="chip" onClick={() => setQ(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <p className="palette__label">{q ? `${results.length} results` : 'Trending now'}</p>
            <ul className="palette__list" data-lenis-prevent>
              {results.length === 0 && <li className="palette__empty">Nothing matches “{q}”. Try “sofa” or “lamp”.</li>}
              {results.map((r, i) => (
                <li
                  key={r.kind === 'product' ? r.p.id : r.pg.to}
                  className={`palette__item ${i === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  {r.kind === 'product' ? (
                    <>
                      <img src={sized(r.p.image, 120)} alt="" />
                      <div>
                        <strong>{r.p.name}</strong>
                        <span className="muted small">
                          {r.p.type} · {formatPrice(r.p.price)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="palette__icon">
                        <FileText size={16} />
                      </span>
                      <div>
                        <strong>{r.pg.label}</strong>
                        <span className="muted small">Page</span>
                      </div>
                    </>
                  )}
                  {i === active ? (
                    <CornerDownLeft size={16} className="palette__enter" />
                  ) : (
                    <ArrowRight size={16} className="palette__enter dim" />
                  )}
                </li>
              ))}
            </ul>
            <div className="palette__foot muted small">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
