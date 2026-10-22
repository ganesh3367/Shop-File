import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, PackageCheck, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice, sized } from '../data/products';
import { useScrollLock } from '../hooks/useLenis';
import { STATUSES, downloadCSV, fmtDate, fmtDateTime } from './lib';
import { PageHead } from './Dashboard';
import { ReturnBadge } from './Returns';
import { useAdmin } from './data';
import { Empty, StatusBadge } from './ui';

const SORTS = {
  newest: (a, b) => b.date.localeCompare(a.date),
  oldest: (a, b) => a.date.localeCompare(b.date),
  high: (a, b) => b.total - a.total,
  low: (a, b) => a.total - b.total,
};

export default function Orders() {
  const { orders } = useAdmin();
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('newest');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders
      .filter((o) => status === 'All' || o.status === status)
      .filter((o) => !query || `${o.id} ${o.customer.name} ${o.customer.email} ${o.customer.city}`.toLowerCase().includes(query))
      .sort(SORTS[sort]);
  }, [orders, q, status, sort]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]));
  const selected = orders.find((o) => o.id === id);

  const exportCSV = () =>
    downloadCSV(`gany-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        'Order',
        'Date',
        'Status',
        'Customer',
        'Email',
        'Phone',
        'City',
        'Items',
        'Shipping method',
        'Payment',
        'Subtotal',
        'Shipping',
        'GST',
        'Total',
      ],
      ...list.map((o) => [
        o.id,
        o.date,
        o.status,
        o.customer.name,
        o.customer.email,
        o.customer.phone,
        o.customer.city,
        o.items.map((it) => `${it.qty}× ${it.name}`).join('; '),
        o.method,
        o.payment,
        o.subtotal,
        o.shipping,
        o.gst,
        o.total,
      ]),
    ]);

  return (
    <>
      <PageHead title="Orders">
        <button className="btn btn--ghost btn--sm" onClick={exportCSV} disabled={!list.length}>
          <Download size={15} /> Export CSV
        </button>
      </PageHead>

      <div className="filters-row">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, name, email…" />
        </label>
        <div className="chips">
          {['All', ...STATUSES].map((s) => (
            <button key={s} className={`chip ${status === s ? 'is-active' : ''}`} onClick={() => setStatus(s)}>
              {s}
              <sup>{s === 'All' ? orders.length : counts[s]}</sup>
            </button>
          ))}
        </div>
        <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort orders">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="high">Highest total</option>
          <option value="low">Lowest total</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <Empty title="No orders yet">
          <p className="muted">Orders placed through checkout will show up here.</p>
        </Empty>
      ) : (
        <div className="panel panel--flush">
          <div className="table-wrap">
            <table className="table table--rows">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} className={o.id === id ? 'is-selected' : ''}>
                    <td>
                      <strong>{o.id}</strong>
                      {o.demo && <span className="pill-mini">sample</span>}
                    </td>
                    <td>
                      <span className="cell-stack">
                        {o.customer.name}
                        <small className="muted">{o.customer.email}</small>
                      </span>
                    </td>
                    <td className="muted">{fmtDate(o.date)}</td>
                    <td>{o.items.reduce((s, it) => s + it.qty, 0)}</td>
                    <td className="muted">{o.payment}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="num">
                      <strong>{formatPrice(o.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="muted center pad">No orders match these filters.</p>}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && <OrderPanel key={selected.id} order={selected} onClose={() => navigate('/admin/orders')} />}
      </AnimatePresence>
    </>
  );
}

function OrderPanel({ order, onClose }) {
  const { toast } = useStore();
  const { setOrderStatus } = useAdmin();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  useScrollLock(true);
  const c = order.customer;

  const change = async (s) => {
    if (s === order.status || saving) return;
    setSaving(true);
    try {
      await setOrderStatus(order.id, s, note || undefined);
      toast(`${order.id} marked ${s.toLowerCase()}`);
      setNote('');
    } catch (err) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className="drawer order-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        data-lenis-prevent
        role="dialog"
        aria-label={`Order ${order.id}`}
      >
        <header className="drawer__head">
          <div>
            <h3>{order.id}</h3>
            <span className="muted small">Placed {fmtDateTime(order.date)}</span>
          </div>
          <div className="row-actions">
            <a
              href={`/print/invoice/${order.id}?admin=1`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--sm"
              title="Invoice (PDF)"
            >
              <FileText size={15} /> Invoice
            </a>
            <a
              href={`/print/slip/${order.id}?admin=1`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--sm"
              title="Packing slip"
            >
              <PackageCheck size={15} /> Slip
            </a>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="drawer__body order-panel__body">
          <section>
            <h4>Status</h4>
            <label className="field field--compact">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder=" " maxLength={200} />
              <span className="field__label">Note with the next update (optional, customer sees it)</span>
            </label>
            <div className="status-picker">
              {STATUSES.map((s) => (
                <button key={s} className={order.status === s ? 'is-active' : ''} onClick={() => change(s)}>
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>Items</h4>
            <ul className="mini-list">
              {order.items.map((it, i) => (
                <li key={i}>
                  <img src={sized(it.image, 120)} alt="" />
                  <span>
                    <Link to={`/product/${it.id}`} target="_blank">
                      <strong>{it.name}</strong>
                    </Link>
                    <small className="muted">
                      {it.qty} × {formatPrice(it.price)} · {it.color} · {it.material}
                    </small>
                  </span>
                  <strong>{formatPrice(it.price * it.qty)}</strong>
                </li>
              ))}
            </ul>
            <dl className="totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div>
                  <dt>Discount ({order.couponCode})</dt>
                  <dd>−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div>
                <dt>Shipping ({order.method})</dt>
                <dd>{order.shipping ? formatPrice(order.shipping) : 'Free'}</dd>
              </div>
              <div>
                <dt>GST</dt>
                <dd>{formatPrice(order.gst)}</dd>
              </div>
              <div className="totals__grand">
                <dt>Total · {order.payment}</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {order.return && (
            <section>
              <h4>Return</h4>
              <p>
                <ReturnBadge status={order.return.status} /> <strong>{order.return.reason}</strong>
              </p>
              {order.return.details && <p className="note">“{order.return.details}”</p>}
              <Link to="/admin/returns" className="link-btn">
                Manage in Returns →
              </Link>
            </section>
          )}

          <section>
            <h4>Customer</h4>
            <p>
              <Link to={`/admin/customers/${encodeURIComponent(c.email)}`} className="table__link">
                <strong>{c.name}</strong>
              </Link>
              <br />
              <a href={`mailto:${c.email}`}>{c.email}</a>
              <br />
              <a href={`tel:${c.phone}`}>{c.phone}</a>
            </p>
            <p className="muted">
              {c.address}, {c.city}, {c.state} {c.zip}, {c.country}
            </p>
            {c.notes && <p className="note">“{c.notes}”</p>}
          </section>

          <section>
            <h4>Timeline</h4>
            <ol className="timeline-mini">
              {[...(order.history ?? [])].reverse().map((h, i) => (
                <li key={i}>
                  <span className="timeline-mini__main">
                    <StatusBadge status={h.status} />
                    {h.note && <span className="muted small">“{h.note}”</span>}
                  </span>
                  <span className="muted small">{fmtDateTime(h.date)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </motion.aside>
    </>
  );
}
