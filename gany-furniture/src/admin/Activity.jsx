import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Mail, Package, RotateCcw, Search, Star, Ticket, User } from 'lucide-react';
import { fmtDateTime } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

const ENTITY = {
  order: { icon: Package, label: 'Orders', link: (id) => id && `/admin/orders/${id}` },
  return: { icon: RotateCcw, label: 'Returns', link: (id) => id && `/admin/orders/${id}` },
  product: { icon: Boxes, label: 'Products', link: (id) => id && `/admin/products?edit=${id}` },
  review: { icon: Star, label: 'Reviews', link: () => '/admin/reviews' },
  coupon: { icon: Ticket, label: 'Discount codes', link: () => '/admin/coupons' },
  customer: { icon: User, label: 'Customers', link: (id) => id && `/admin/customers/${encodeURIComponent(id)}` },
  message: { icon: Mail, label: 'Messages', link: () => '/admin/messages' },
};

/** Who did what, and when — every admin change is recorded on the server. */
export default function ActivityLog() {
  const { activity, refresh } = useAdmin();
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('all');

  useEffect(() => {
    refresh('activity').catch(() => {});
  }, [refresh]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return activity
      .filter((a) => entity === 'all' || a.entity === entity)
      .filter((a) => !query || `${a.admin} ${a.action} ${a.entityId ?? ''} ${a.details}`.toLowerCase().includes(query));
  }, [activity, q, entity]);

  // Group entries by calendar day for a readable timeline.
  const days = useMemo(() => {
    const map = new Map();
    for (const a of list) {
      const day = new Date(a.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(a);
    }
    return [...map];
  }, [list]);

  return (
    <>
      <PageHead title="Activity log" />
      <div className="filters-row">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" />
        </label>
        <div className="chips">
          <button className={`chip ${entity === 'all' ? 'is-active' : ''}`} onClick={() => setEntity('all')}>
            Everything
          </button>
          {Object.entries(ENTITY).map(([k, v]) => (
            <button key={k} className={`chip ${entity === k ? 'is-active' : ''}`} onClick={() => setEntity(k)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title="No activity yet">
          <p className="muted">Changes made in the admin panel — status updates, edits, refunds — are recorded here.</p>
        </Empty>
      ) : (
        <div className="panel activity">
          {days.map(([day, entries]) => (
            <section key={day}>
              <h3 className="activity__day">{day}</h3>
              <ol>
                {entries.map((a) => {
                  const meta = ENTITY[a.entity] ?? ENTITY.order;
                  const Icon = meta.icon;
                  const href = meta.link(a.entityId);
                  return (
                    <li key={a.id}>
                      <span className="activity__icon">
                        <Icon size={15} />
                      </span>
                      <span className="activity__text">
                        <strong>{a.admin}</strong> {a.action.charAt(0).toLowerCase() + a.action.slice(1)}
                        {a.entityId &&
                          (href ? (
                            <>
                              {' '}
                              <Link to={href} className="table__link">
                                {a.entityId}
                              </Link>
                            </>
                          ) : (
                            ` ${a.entityId}`
                          ))}
                        {a.details && <span className="muted"> — {a.details}</span>}
                      </span>
                      <time className="muted small">{fmtDateTime(a.date).split(', ').at(-1)}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
