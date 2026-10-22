import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpDown, Box, Download, ExternalLink, Eye, EyeOff, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, CATEGORY_DEFAULTS, formatPrice, sized } from '../data/products';
import { useScrollLock } from '../hooks/useLenis';
import { downloadCSV, productStats } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';

const COLUMNS = [
  { key: 'name', label: 'Product' },
  { key: 'type', label: 'Type' },
  { key: 'price', label: 'Price', num: true },
  { key: 'stock', label: 'Stock', num: true },
  { key: 'units', label: 'Sold', num: true },
  { key: 'revenue', label: 'Revenue', num: true },
];
const VIEWS = ['All', 'Live', 'Hidden', 'Low stock', 'Sold out'];

export default function Products() {
  const { orders, products, lowStock } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [view, setView] = useState('All');
  const [sort, setSort] = useState({ key: 'revenue', dir: -1 });

  const editId = params.get('edit');
  const creating = params.get('new') === '1';
  const editing = creating ? null : products.find((p) => p.id === editId);
  const closeEditor = () => setParams({}, { replace: true });

  const filters = {
    All: () => true,
    Live: (p) => p.active,
    Hidden: (p) => !p.active,
    'Low stock': (p) => p.stock > 0 && p.stock <= lowStock,
    'Sold out': (p) => p.stock === 0,
  };

  const rows = useMemo(() => {
    const stats = productStats(orders);
    const query = q.trim().toLowerCase();
    return products
      .map((p) => ({ ...p, units: stats[p.id]?.units ?? 0, revenue: stats[p.id]?.revenue ?? 0 }))
      .filter((p) => cat === 'all' || p.category === cat)
      .filter(filters[view])
      .filter((p) => !query || `${p.name} ${p.type} ${p.id}`.toLowerCase().includes(query))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, products, lowStock, q, cat, view, sort]);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  return (
    <>
      <PageHead title="Products">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() =>
            downloadCSV('gany-products.csv', [
              ['ID', 'Name', 'Category', 'Type', 'Price', 'Stock', 'Visible', 'Units sold', 'Revenue'],
              ...rows.map((p) => [p.id, p.name, p.category, p.type, p.price, p.stock, p.active ? 'yes' : 'no', p.units, p.revenue]),
            ])
          }
        >
          <Download size={15} /> Export CSV
        </button>
        <button className="btn btn--dark btn--sm" onClick={() => setParams({ new: '1' })}>
          <Plus size={15} /> Add product
        </button>
      </PageHead>

      <div className="filters-row">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" />
        </label>
        <div className="chips">
          {[{ slug: 'all', name: 'All categories' }, ...CATEGORIES].map((c) => (
            <button key={c.slug} className={`chip ${cat === c.slug ? 'is-active' : ''}`} onClick={() => setCat(c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="chips">
        {VIEWS.map((v) => {
          const n = products.filter(filters[v]).length;
          return (
            <button
              key={v}
              className={`chip ${view === v ? 'is-active' : ''} ${v === 'Low stock' && n ? 'chip--warn' : ''}`}
              onClick={() => setView(v)}
            >
              {v}
              <sup>{n}</sup>
            </button>
          );
        })}
      </div>

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={c.num ? 'num' : ''}
                    aria-sort={sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}
                  >
                    <button className="th-sort" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      <ArrowUpDown size={12} className={sort.key === c.key ? '' : 'dim'} />
                    </button>
                  </th>
                ))}
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'is-muted'}>
                  <td>
                    <span className="product-cell">
                      <img src={sized(p.image, 120)} alt="" />
                      <span className="cell-stack">
                        <strong>{p.name}</strong>
                        <small className="muted">
                          {p.id}
                          {p.modelUrl && (
                            <span className="pill-mini" title="Has a 3D model">
                              <Box size={10} /> 3D
                            </span>
                          )}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td className="muted">{p.type}</td>
                  <td className="num">{formatPrice(p.price)}</td>
                  <td className="num">
                    <StockCell product={p} low={lowStock} />
                  </td>
                  <td className="num">{p.units}</td>
                  <td className="num">
                    <strong>{formatPrice(p.revenue)}</strong>
                  </td>
                  <td>
                    <span className={`pill-mini ${p.active ? 'pill-mini--ok' : ''}`}>{p.active ? 'Live' : 'Hidden'}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setParams({ edit: p.id })} aria-label={`Edit ${p.name}`}>
                        <Pencil size={15} />
                      </button>
                      {p.active && (
                        <Link to={`/product/${p.id}`} target="_blank" className="icon-btn" aria-label={`Open ${p.name} in store`}>
                          <ExternalLink size={15} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted center pad">No products match.</p>}
        </div>
      </div>

      <AnimatePresence>
        {(creating || editing) && <ProductEditor key={editId ?? 'new'} product={editing} onClose={closeEditor} />}
      </AnimatePresence>
    </>
  );
}

/** Stock you can edit right in the table: type a number, press Enter or click away. */
function StockCell({ product, low }) {
  const { setStock } = useAdmin();
  const { toast } = useStore();
  const [value, setValue] = useState(String(product.stock));
  useEffect(() => setValue(String(product.stock)), [product.stock]);

  const commit = async () => {
    const n = Number(value);
    if (value === '' || !Number.isInteger(n) || n < 0) return setValue(String(product.stock));
    if (n === product.stock) return;
    try {
      await setStock(product.id, n);
      toast(`${product.name}: stock set to ${n}`);
    } catch (err) {
      toast(err.message);
      setValue(String(product.stock));
    }
  };

  const state = product.stock === 0 ? 'is-out' : product.stock <= low ? 'is-low' : '';
  return (
    <input
      className={`stock-input ${state}`}
      value={value}
      inputMode="numeric"
      onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label={`Stock for ${product.name}`}
    />
  );
}

/* ------------------------------------------------------------------------- */
/* Create / edit                                                              */
/* ------------------------------------------------------------------------- */
const blank = (category = 'seating') => ({
  id: '',
  name: '',
  category,
  type: '',
  price: '',
  compareAt: '',
  image: '',
  badge: '',
  stock: 10,
  ...structuredClone(CATEGORY_DEFAULTS[category]),
  modelUrl: '',
  modelCredit: '',
  featured: false,
  active: true,
});

const FIELD_ERRORS = [
  'name',
  'id',
  'price',
  'compareAt',
  'stock',
  'image',
  'type',
  'story',
  'dimensions',
  'colors',
  'materials',
  'modelUrl',
];

function ProductEditor({ product, onClose }) {
  const { saveProduct, deleteProduct, upload } = useAdmin();
  const { toast } = useStore();
  const isNew = !product;
  const [form, setForm] = useState(() =>
    isNew
      ? blank()
      : {
          ...product,
          compareAt: product.compareAt ?? '',
          badge: product.badge ?? '',
          modelUrl: product.modelUrl ?? '',
          modelCredit: product.modelCredit ?? '',
        },
  );
  // A new product follows its category's colours, materials and copy until those are edited by hand.
  const [customised, setCustomised] = useState(!isNew);
  const [error, setError] = useState({ message: '', field: '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const imageRef = useRef(null);
  const modelRef = useRef(null);
  useScrollLock(true);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setDefaultish = (k, v) => {
    setCustomised(true);
    set(k, v);
  };
  const setCategory = (category) =>
    setForm((f) => ({ ...f, category, ...(customised ? {} : structuredClone(CATEGORY_DEFAULTS[category])) }));

  const doUpload = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await upload(kind, file);
      set(kind === 'image' ? 'image' : 'modelUrl', url);
      toast(kind === 'image' ? 'Image uploaded' : '3D model uploaded');
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading('');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError({ message: '', field: '' });
    const payload = {
      ...form,
      id: isNew ? form.id || undefined : undefined,
      price: Number(form.price),
      compareAt: form.compareAt === '' ? null : Number(form.compareAt),
      badge: form.badge || null,
      stock: Number(form.stock),
      modelUrl: form.modelUrl || null,
      modelCredit: form.modelCredit || null,
    };
    for (const k of ['rating', 'reviews', 'updatedAt']) delete payload[k];
    try {
      const saved = await saveProduct(payload, isNew ? null : product.id);
      toast(isNew ? `${saved.name} added to the catalogue` : `${saved.name} saved`);
      onClose();
    } catch (err) {
      setError({ message: err.message, field: (err.field ?? '').split('.')[0] });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${product.name}? Products with orders are hidden instead, so order history stays intact.`)) return;
    try {
      const res = await deleteProduct(product.id);
      toast(res.hidden ? `${product.name} has orders, so it was hidden from the shop instead` : `${product.name} deleted`);
      onClose();
    } catch (err) {
      toast(err.message);
    }
  };

  const fieldError = (k) => (error.field === k ? <small className="field__error">{error.message}</small> : null);
  // Called as a function (not <Field/>) so inputs keep focus while typing.
  const field = (k, label, { wide, ...rest } = {}) => (
    <label className={`field ${wide ? 'field--wide' : ''} ${error.field === k ? 'has-error' : ''}`}>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder=" " {...rest} />
      <span className="field__label">{label}</span>
      {fieldError(k)}
    </label>
  );

  return (
    <>
      <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className="drawer editor"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label={isNew ? 'Add product' : `Edit ${product.name}`}
      >
        <header className="drawer__head">
          <h3>{isNew ? 'New product' : 'Edit product'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <form className="drawer__body editor__body" onSubmit={save} id="product-form" data-lenis-prevent noValidate>
          <section>
            <h4>Basics</h4>
            <div className="form-grid">
              {field('name', 'Product name', { wide: true })}
              {isNew && field('id', 'URL id (optional, e.g. oak-stool)', { wide: true })}
              <label className="field">
                <select value={form.category} onChange={(e) => setCategory(e.target.value)} className="field__select">
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="field__label field__label--fixed">Category</span>
              </label>
              {field('type', 'Type (e.g. Sofas)')}
            </div>
          </section>

          <section>
            <h4>Price & stock</h4>
            <div className="form-grid">
              {field('price', 'Price (₹)', { inputMode: 'numeric' })}
              {field('compareAt', 'Compare-at price (₹, optional)', { inputMode: 'numeric' })}
              {field('stock', 'In stock', { inputMode: 'numeric' })}
              <label className="field">
                <select value={form.badge} onChange={(e) => set('badge', e.target.value)} className="field__select">
                  <option value="">No badge</option>
                  <option>New</option>
                  <option>Bestseller</option>
                  <option>Sale</option>
                </select>
                <span className="field__label field__label--fixed">Badge</span>
              </label>
            </div>
          </section>

          <section>
            <h4>Image</h4>
            <div className="media-row">
              <div className="media-row__preview">
                {form.image ? <img src={sized(form.image, 300)} alt="" /> : <span className="muted small">No image</span>}
              </div>
              <div className="media-row__inputs">
                {field('image', 'Image URL', { wide: true })}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => imageRef.current?.click()} disabled={!!uploading}>
                  {uploading === 'image' ? <span className="spinner" /> : <Upload size={15} />} Upload image
                </button>
                <input
                  ref={imageRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => doUpload('image', e.target.files?.[0])}
                />
              </div>
            </div>
          </section>

          <section>
            <h4>Colours</h4>
            <div className="variant-list">
              {form.colors.map((c, i) => (
                <div key={i} className="variant-row">
                  <input
                    type="color"
                    value={c.hex.length === 4 ? `#${[...c.hex.slice(1)].map((x) => x + x).join('')}` : c.hex}
                    onChange={(e) =>
                      setDefaultish(
                        'colors',
                        form.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)),
                      )
                    }
                    aria-label={`Colour ${i + 1}`}
                  />
                  <input
                    className="variant-row__name"
                    value={c.name}
                    onChange={(e) =>
                      setDefaultish(
                        'colors',
                        form.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    placeholder="Colour name"
                    aria-label={`Colour ${i + 1} name`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setDefaultish(
                        'colors',
                        form.colors.filter((_, j) => j !== i),
                      )
                    }
                    disabled={form.colors.length === 1}
                    aria-label="Remove colour"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {form.colors.length < 8 && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setDefaultish('colors', [...form.colors, { name: '', hex: '#c9a57a' }])}
                >
                  + Add colour
                </button>
              )}
              {fieldError('colors')}
            </div>
            <h4>Materials</h4>
            <div className="chips materials">
              {form.materials.map((m, i) => (
                <span key={m + i} className="chip chip--removable">
                  {m}
                  <button
                    type="button"
                    onClick={() =>
                      setDefaultish(
                        'materials',
                        form.materials.filter((_, j) => j !== i),
                      )
                    }
                    aria-label={`Remove ${m}`}
                    disabled={form.materials.length === 1}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                className="chip-input"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMaterial.trim()) {
                    e.preventDefault();
                    setDefaultish('materials', [...form.materials, newMaterial.trim()]);
                    setNewMaterial('');
                  }
                }}
                placeholder="Add material + Enter"
                aria-label="Add material"
              />
            </div>
            {fieldError('materials')}
          </section>

          <section>
            <h4>Description</h4>
            <label className={`field ${error.field === 'story' ? 'has-error' : ''}`}>
              <textarea rows={4} value={form.story} onChange={(e) => setDefaultish('story', e.target.value)} placeholder=" " />
              <span className="field__label">Story</span>
              {fieldError('story')}
            </label>
            {field('dimensions', 'Dimensions')}
          </section>

          <section>
            <h4>3D / AR model (optional)</h4>
            <div className="form-grid">
              {field('modelUrl', '.glb model URL', { wide: true })}
              {field('modelCredit', 'Model credit / licence', { wide: true })}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => modelRef.current?.click()} disabled={!!uploading}>
              {uploading === 'model' ? <span className="spinner" /> : <Upload size={15} />} Upload .glb
            </button>
            <input
              ref={modelRef}
              type="file"
              hidden
              accept=".glb,model/gltf-binary"
              onChange={(e) => doUpload('model', e.target.files?.[0])}
            />
          </section>

          <section className="editor__toggles">
            <label className="check">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              {form.active ? <Eye size={15} /> : <EyeOff size={15} />} Visible in the shop
            </label>
            <label className="check">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              Feature on the home page
            </label>
          </section>

          {error.message && !FIELD_ERRORS.includes(error.field) && <p className="form-error">{error.message}</p>}
        </form>

        <footer className="drawer__foot editor__foot">
          {!isNew && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={remove}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button form="product-form" className="btn btn--dark btn--grow" disabled={busy || !!uploading}>
            {busy ? <span className="spinner" /> : isNew ? 'Add product' : 'Save changes'}
          </button>
        </footer>
      </motion.aside>
    </>
  );
}
