import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Download, ExternalLink, Search } from 'lucide-react';
import { CATEGORIES, PRODUCTS, formatPrice, sized } from '../data/products';
import { downloadCSV, productStats } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';

const COLUMNS = [
  { key: 'name', label: 'Product' },
  { key: 'type', label: 'Type' },
  { key: 'price', label: 'Price', num: true },
  { key: 'rating', label: 'Rating', num: true },
  { key: 'units', label: 'Units sold', num: true },
  { key: 'revenue', label: 'Revenue', num: true },
];

export default function Products() {
  const { orders } = useAdmin();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState({ key: 'revenue', dir: -1 });

  const rows = useMemo(() => {
    const stats = productStats(orders);
    const query = q.trim().toLowerCase();
    return PRODUCTS.map((p) => ({ ...p, ...stats[p.id] }))
      .filter((p) => cat === 'all' || p.category === cat)
      .filter((p) => !query || `${p.name} ${p.type}`.toLowerCase().includes(query))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sort.dir;
      });
  }, [orders, q, cat, sort]);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  return (
    <>
      <PageHead title="Products">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() =>
            downloadCSV('gany-products.csv', [
              ['ID', 'Name', 'Category', 'Type', 'Price', 'Units sold', 'Revenue'],
              ...rows.map((p) => [p.id, p.name, p.category, p.type, p.price, p.units, p.revenue]),
            ])
          }
        >
          <Download size={15} /> Export CSV
        </button>
      </PageHead>

      <div className="filters-row">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" />
        </label>
        <div className="chips">
          {[{ slug: 'all', name: 'All' }, ...CATEGORIES].map((c) => (
            <button key={c.slug} className={`chip ${cat === c.slug ? 'is-active' : ''}`} onClick={() => setCat(c.slug)}>
              {c.name}
              <sup>{c.slug === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c.slug).length}</sup>
            </button>
          ))}
        </div>
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
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="product-cell">
                      <img src={sized(p.image, 120)} alt="" />
                      <span className="cell-stack">
                        <strong>{p.name}</strong>
                        <small className="muted">
                          {p.category}
                          {p.badge && ` · ${p.badge}`}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td className="muted">{p.type}</td>
                  <td className="num">
                    {formatPrice(p.price)}
                    {p.compareAt && <s className="muted small"> {formatPrice(p.compareAt)}</s>}
                  </td>
                  <td className="num">★ {p.rating}</td>
                  <td className="num">{p.units}</td>
                  <td className="num">
                    <strong>{formatPrice(p.revenue)}</strong>
                  </td>
                  <td>
                    <Link to={`/product/${p.id}`} target="_blank" className="icon-btn" aria-label={`Open ${p.name} in store`}>
                      <ExternalLink size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted center pad">No products match.</p>}
        </div>
      </div>
    </>
  );
}
