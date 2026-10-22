import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Heart, KeyRound, Mail, MapPin, Phone, RotateCcw, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice, sized } from '../data/products';
import { compactINR, fmtDate, isRevenue } from './lib';
import { useAdmin } from './data';
import { ReturnBadge } from './Returns';
import { Empty, StatTile, StatusBadge } from './ui';

const longDate = { day: 'numeric', month: 'short', year: 'numeric' };

/** Everything about one customer: lifetime value, full order history, returns, addresses, reviews, wishlist. */
export default function CustomerProfile() {
  const { email } = useParams();
  const { customerProfile, createResetLink, products, orders: allOrders } = useAdmin();
  const { toast } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(null);

  useEffect(() => {
    setData(null);
    customerProfile(email)
      .then(setData)
      .catch((err) => setError(err.message));
    // Re-fetch when orders change (e.g. a status update elsewhere in the panel).
  }, [email, customerProfile, allOrders]);

  if (error) {
    return (
      <Empty title={error}>
        <Link to="/admin/customers" className="btn btn--dark btn--sm">
          Back to customers
        </Link>
      </Empty>
    );
  }
  if (!data) return <span className="spinner" />;

  const { customer, orders, addresses, reviews, wishlist } = data;
  const paid = orders.filter(isRevenue);
  const spent = paid.reduce((s, o) => s + o.total, 0);
  const returns = orders.filter((o) => o.return);
  const wished = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const absolute = reset ? `${window.location.origin}${reset.url}` : '';

  const makeReset = async () => {
    try {
      setReset(await createResetLink(customer.email));
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <Link to="/admin/customers" className="text-link back">
        <ArrowLeft size={16} /> All customers
      </Link>

      <header className="profile-head panel">
        <span className="avatar avatar--xl">{customer.name[0]}</span>
        <div className="profile-head__info">
          <h1>{customer.name}</h1>
          <p className="muted">
            <Mail size={14} /> <a href={`mailto:${customer.email}`}>{customer.email}</a>
            {customer.phone && (
              <>
                {' '}
                · <Phone size={14} /> <a href={`tel:${customer.phone}`}>{customer.phone}</a>
              </>
            )}
          </p>
          <p className="small">
            {customer.account ? (
              <span className="pill-mini pill-mini--ok">Registered {fmtDate(customer.account.joined, longDate)}</span>
            ) : (
              <span className="pill-mini">Guest checkout</span>
            )}
          </p>
        </div>
        {customer.account && (
          <div className="profile-head__actions">
            <button className="btn btn--ghost btn--sm" onClick={makeReset}>
              <KeyRound size={15} /> Password reset link
            </button>
          </div>
        )}
      </header>

      {reset && (
        <div className="notice">
          <KeyRound size={16} />
          <span className="reset-link">
            Send this link to {customer.name.split(' ')[0]} (valid 30 minutes, single use): <code>{absolute}</code>
          </span>
          <button className="link-btn" onClick={() => navigator.clipboard?.writeText(absolute).then(() => toast('Link copied'))}>
            <Copy size={13} /> Copy
          </button>
        </div>
      )}

      <section className="tiles tiles--5">
        <StatTile label="Lifetime spend" value={compactINR(spent)} />
        <StatTile label="Orders" value={orders.length} />
        <StatTile label="Average order" value={compactINR(paid.length ? Math.round(spent / paid.length) : 0)} />
        <StatTile label="First order" value={orders.length ? fmtDate(orders.at(-1).date) : '—'} />
        <StatTile label="Last order" value={orders.length ? fmtDate(orders[0].date) : '—'} />
      </section>

      <section className="admin-grid">
        <div className="panel panel--tall">
          <h3 className="panel__title">Order history</h3>
          {orders.length === 0 ? (
            <p className="muted small">No orders yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table table--rows">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)}>
                      <td>
                        <strong>{o.id}</strong>
                        {o.demo && <span className="pill-mini">sample</span>}
                      </td>
                      <td className="muted">{fmtDate(o.date, longDate)}</td>
                      <td>
                        <div className="thumbs">
                          {o.items.slice(0, 3).map((it, i) => (
                            <img key={i} src={sized(it.image, 80)} alt={it.name} title={it.name} />
                          ))}
                          {o.items.length > 3 && <span className="muted small">+{o.items.length - 3}</span>}
                        </div>
                      </td>
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
            </div>
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">
            <MapPin size={15} /> Addresses
          </h3>
          {addresses.length ? (
            <ul className="profile-list">
              {addresses.map((a) => (
                <li key={a.id}>
                  <strong>
                    {a.label}
                    {a.isDefault && <span className="pill-mini">default</span>}
                  </strong>
                  <span className="muted small">
                    {a.address}, {a.city} {a.zip}
                  </span>
                </li>
              ))}
            </ul>
          ) : orders[0] ? (
            <p className="muted small">
              Last delivery: {orders[0].customer.address}, {orders[0].customer.city} {orders[0].customer.zip}
            </p>
          ) : (
            <p className="muted small">None saved.</p>
          )}

          <h3 className="panel__title panel__title--spaced">
            <RotateCcw size={15} /> Returns
          </h3>
          {returns.length ? (
            <ul className="profile-list">
              {returns.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="table__link">
                    {o.id}
                  </Link>
                  <span className="profile-list__row">
                    <span className="muted small">{o.return.reason}</span>
                    <ReturnBadge status={o.return.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No returns.</p>
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">
            <Star size={15} /> Reviews
          </h3>
          {reviews.length ? (
            <ul className="profile-list">
              {reviews.map((r) => (
                <li key={r.id}>
                  <strong>
                    {'★'.repeat(r.rating)} {r.title}
                  </strong>
                  <span className="muted small">
                    {r.product.name} · {r.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">{customer.account ? 'No reviews yet.' : 'Guests can’t leave reviews.'}</p>
          )}

          <h3 className="panel__title panel__title--spaced">
            <Heart size={15} /> Wishlist
          </h3>
          {wished.length ? (
            <div className="thumbs thumbs--lg">
              {wished.map((p) => (
                <Link key={p.id} to={`/admin/products?edit=${p.id}`} title={p.name}>
                  <img src={sized(p.image, 120)} alt={p.name} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted small">Nothing saved.</p>
          )}
        </div>
      </section>
    </>
  );
}
