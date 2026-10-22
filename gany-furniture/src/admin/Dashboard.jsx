import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, PRODUCTS, formatPrice, sized } from '../data/products';
import { STATUSES, compactINR, customersFrom, dailySeries, fmtDate, isRevenue, productStats, rangeOrders } from './lib';
import { useAdmin } from './data';
import { BarList, Empty, RevenueChart, StatTile, StatusBadge, pctChange } from './ui';

const RANGES = [7, 14, 30];

export default function Dashboard() {
  const { toast } = useStore();
  const { orders, messages, subscribers, loadSample, removeSample } = useAdmin();
  const [busy, setBusy] = useState(false);
  const run = async (fn, done) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };
  const [days, setDays] = useState(14);

  const m = useMemo(() => {
    const cur = rangeOrders(orders, days);
    const prev = rangeOrders(orders, days, days);
    const rev = (list) => list.filter(isRevenue).reduce((s, o) => s + o.total, 0);
    const paid = (list) => list.filter(isRevenue).length;
    const revenue = rev(cur);
    const prevRevenue = rev(prev);
    const aov = paid(cur) ? revenue / paid(cur) : 0;
    const prevAov = paid(prev) ? prevRevenue / paid(prev) : 0;
    const customers = customersFrom(cur).length;

    const byCategory = CATEGORIES.map((c) => ({
      label: c.name,
      value: cur
        .filter(isRevenue)
        .flatMap((o) => o.items)
        .filter((it) => it.category === c.slug)
        .reduce((s, it) => s + it.price * it.qty, 0),
    }));

    const stats = productStats(cur);
    const top = PRODUCTS.map((p) => ({ ...p, ...stats[p.id] }))
      .filter((p) => p.units > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue,
      revenueDelta: pctChange(revenue, prevRevenue),
      count: cur.length,
      countDelta: pctChange(cur.length, prev.length),
      aov,
      aovDelta: pctChange(aov, prevAov),
      customers,
      customersDelta: pctChange(customers, customersFrom(prev).length),
      series: dailySeries(orders, days),
      byCategory,
      byStatus: STATUSES.map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length })),
      top,
    };
  }, [orders, days]);

  const demoCount = orders.filter((o) => o.demo).length;
  const unread = messages.filter((x) => !x.read).length;

  if (orders.length === 0) {
    return (
      <>
        <PageHead title="Dashboard" />
        <Empty title="No orders yet">
          <p className="muted">Orders placed in the shop appear here. Load sample data to explore the dashboard first.</p>
          <button className="btn btn--dark" onClick={() => run(loadSample, 'Loaded 46 sample orders')} disabled={busy}>
            <Sparkles size={16} /> Load sample data
          </button>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHead title="Dashboard">
        {demoCount === 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => run(loadSample, 'Loaded 46 sample orders')} disabled={busy}>
            <Sparkles size={15} /> Load sample data
          </button>
        )}
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r} className={days === r ? 'is-active' : ''} onClick={() => setDays(r)}>
              <span>{r} days</span>
            </button>
          ))}
        </div>
      </PageHead>

      {demoCount > 0 && (
        <div className="notice">
          <Sparkles size={16} />
          <span>Includes {demoCount} sample orders. Real orders from the checkout are added alongside them.</span>
          <button className="link-btn" onClick={() => run(removeSample, 'Sample orders removed')} disabled={busy}>
            Remove sample data
          </button>
        </div>
      )}

      <section className="tiles">
        <StatTile label="Revenue" value={compactINR(m.revenue)} delta={m.revenueDelta} period={`vs prior ${days}d`} />
        <StatTile label="Orders" value={m.count.toLocaleString('en-IN')} delta={m.countDelta} period={`vs prior ${days}d`} />
        <StatTile label="Average order" value={compactINR(Math.round(m.aov))} delta={m.aovDelta} period={`vs prior ${days}d`} />
        <StatTile label="Customers" value={m.customers} delta={m.customersDelta} period={`vs prior ${days}d`} />
      </section>

      <section className="admin-grid">
        <div className="panel panel--wide">
          <h3 className="panel__title">Daily revenue</h3>
          <RevenueChart data={m.series} />
        </div>

        <div className="panel">
          <h3 className="panel__title">Sales by category</h3>
          <BarList rows={m.byCategory} format={(v) => formatPrice(v)} />
          <h3 className="panel__title panel__title--spaced">Orders by status</h3>
          <ul className="status-list">
            {m.byStatus.map((s) => (
              <li key={s.status}>
                <StatusBadge status={s.status} />
                <strong>{s.count}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel panel--tall">
          <div className="panel__head">
            <h3 className="panel__title">Recent orders</h3>
            <Link to="/admin/orders" className="link-btn">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 9).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="table__link">
                        {o.id}
                      </Link>
                    </td>
                    <td>{o.customer.name}</td>
                    <td className="muted">{fmtDate(o.date)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="num">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title">Top products</h3>
            <Link to="/admin/products" className="link-btn">
              All products
            </Link>
          </div>
          {m.top.length === 0 ? (
            <p className="muted small">No sales in this period.</p>
          ) : (
            <ul className="mini-list">
              {m.top.map((p) => (
                <li key={p.id}>
                  <img src={sized(p.image, 120)} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small className="muted">{p.units} sold</small>
                  </span>
                  <strong>{formatPrice(p.revenue)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">Inbox</h3>
          <div className="inbox-stats">
            <Link to="/admin/messages">
              <strong>{unread}</strong>
              <span className="muted small">Unread messages</span>
            </Link>
            <Link to="/admin/customers?tab=newsletter">
              <strong>{subscribers.length}</strong>
              <span className="muted small">Newsletter subscribers</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function PageHead({ title, children }) {
  return (
    <div className="admin-head">
      <h1>{title}</h1>
      {children && <div className="admin-head__actions">{children}</div>}
    </div>
  );
}
