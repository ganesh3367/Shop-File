import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Rows3, Search, SlidersHorizontal, X } from 'lucide-react';
import { CATEGORIES, PRODUCTS, formatPrice } from '../data/products';
import ProductCard from '../components/ProductCard';
import { Page, SplitText, ease } from '../components/motion';

const SORTS = {
  featured: { label: 'Featured', fn: (a, b) => Number(b.featured) - Number(a.featured) },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  rating: { label: 'Top rated', fn: (a, b) => b.rating - a.rating },
  name: { label: 'A → Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

const MAX_PRICE = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 5000) * 5000;

export default function Shop() {
  const { category = 'all' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const type = params.get('type') ?? 'All';
  const max = Number(params.get('max') ?? MAX_PRICE);
  const dense = params.get('view') === 'dense';
  const onSale = params.get('sale') === '1';

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const meta = CATEGORIES.find((c) => c.slug === category);
  const inCategory = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  const types = ['All', ...new Set(inCategory.map((p) => p.type))];

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return inCategory
      .filter((p) => type === 'All' || p.type === type)
      .filter((p) => p.price <= max)
      .filter((p) => !onSale || p.compareAt)
      .filter((p) => !query || `${p.name} ${p.type} ${p.category}`.toLowerCase().includes(query))
      .sort(SORTS[sort]?.fn ?? SORTS.featured.fn);
  }, [inCategory, type, max, onSale, q, sort]);

  const activeFilters = [
    type !== 'All' && { label: type, clear: () => update({ type: null }) },
    max < MAX_PRICE && { label: `Under ${formatPrice(max)}`, clear: () => update({ max: null }) },
    onSale && { label: 'On sale', clear: () => update({ sale: null }) },
    q && { label: `“${q}”`, clear: () => update({ q: null }) },
  ].filter(Boolean);

  return (
    <Page className="shop" label={meta?.name ?? 'Shop'}>
      <header className="shop__hero container">
        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/">Home</Link> / <Link to="/shop">Shop</Link>
          {meta && <> / {meta.name}</>}
        </motion.p>
        <SplitText as="h1" key={category} className="mega" text={meta ? meta.name : 'The Collection'} delay={0.3} />
        <motion.p className="lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          {meta ? meta.tagline : 'Every piece we make: seating, tables and lighting, handcrafted to live with for a lifetime.'}
        </motion.p>

        <nav className="cat-tabs" aria-label="Categories">
          {[{ slug: 'all', name: 'All' }, ...CATEGORIES].map((c) => (
            <button
              key={c.slug}
              className={category === c.slug ? 'is-active' : ''}
              onClick={() => navigate(c.slug === 'all' ? `/shop?${params}` : `/shop/${c.slug}`)}
            >
              {category === c.slug && <motion.span layoutId="cat-tab" className="cat-tabs__bg" transition={{ duration: 0.5, ease }} />}
              <span>{c.name}</span>
              <sup>{c.slug === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c.slug).length}</sup>
            </button>
          ))}
        </nav>
      </header>

      <div className="toolbar-wrap">
        <div className="toolbar container">
          <label className="toolbar__search">
            <Search size={16} />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search this collection…" />
            {q && (
              <button onClick={() => update({ q: null })} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>

          <div className="chips">
            {types.map((t) => (
              <button key={t} className={`chip ${type === t ? 'is-active' : ''}`} onClick={() => update({ type: t === 'All' ? null : t })}>
                {t}
              </button>
            ))}
          </div>

          <div className="toolbar__right">
            <button className={`chip ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen((o) => !o)}>
              <SlidersHorizontal size={14} /> Filters
            </button>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })}
              aria-label="Sort"
            >
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="view-toggle">
              <button className={!dense ? 'is-active' : ''} onClick={() => update({ view: null })} aria-label="Large grid">
                <Rows3 size={16} />
              </button>
              <button className={dense ? 'is-active' : ''} onClick={() => update({ view: 'dense' })} aria-label="Dense grid">
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              className="filters container"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease }}
            >
              <div className="filters__inner">
                <label className="range">
                  <span>
                    Max price <strong>{formatPrice(max)}</strong>
                  </span>
                  <input
                    type="range"
                    min={1000}
                    max={MAX_PRICE}
                    step={1000}
                    value={max}
                    onChange={(e) => update({ max: Number(e.target.value) >= MAX_PRICE ? null : e.target.value })}
                    style={{ '--fill': `${(max / MAX_PRICE) * 100}%` }}
                  />
                </label>
                <label className="switch">
                  <input type="checkbox" checked={onSale} onChange={(e) => update({ sale: e.target.checked ? '1' : null })} />
                  <span className="switch__track">
                    <motion.span className="switch__thumb" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </span>
                  On sale only
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="container shop__results">
        <div className="shop__meta">
          <motion.p key={results.length} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="muted">
            Showing <strong>{results.length}</strong> {results.length === 1 ? 'piece' : 'pieces'}
          </motion.p>
          <div className="active-filters">
            <AnimatePresence>
              {activeFilters.map((f) => (
                <motion.button
                  key={f.label}
                  className="chip chip--removable"
                  onClick={f.clear}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                >
                  {f.label} <X size={12} />
                </motion.button>
              ))}
            </AnimatePresence>
            {activeFilters.length > 1 && (
              <button className="link-btn" onClick={() => setParams({}, { replace: true })}>
                Clear all
              </button>
            )}
          </div>
        </div>

        <motion.div className={`grid ${dense ? 'grid--dense' : ''}`} layout>
          <AnimatePresence mode="popLayout">
            {results.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {results.length === 0 && (
          <motion.div className="empty empty--page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3>Nothing quite fits.</h3>
            <p className="muted">Try a different search or loosen your filters.</p>
            <button className="btn btn--dark" onClick={() => setParams({}, { replace: true })}>
              Reset filters
            </button>
          </motion.div>
        )}
      </section>
    </Page>
  );
}
