import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  LogOut,
  MapPin,
  Package,
  Pencil,
  RotateCcw,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { formatPrice, sized } from '../data/products';
import { Page, ease } from '../components/motion';

const fmt = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(iso).toLocaleDateString('en-IN', opts);
const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const RETURN_WINDOW_DAYS = 30;

/** Redirects to /login (and back here afterwards) when nobody is signed in. */
function useRequireUser() {
  const { user } = useStore();
  const location = useLocation();
  return user ? null : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

/* ------------------------------------------------------------------------- */
/* /account                                                                   */
/* ------------------------------------------------------------------------- */
export default function Account() {
  const redirect = useRequireUser();
  const { user, token, logout, toast, wishlist, count } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'addresses' ? 'addresses' : 'orders';
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api('/orders/mine', { token })
      .then((d) => setOrders(d.orders))
      .catch((err) => setError(err.message));
  }, [token]);

  if (redirect) return redirect;

  return (
    <Page className="account-page" label="Account">
      <div className="container account-wrap">
        <header className="account-head">
          <motion.span
            className="avatar avatar--xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            {user.name[0].toUpperCase()}
          </motion.span>
          <div>
            <h1 className="display">Hello, {user.name.split(' ')[0]}.</h1>
            <p className="muted">{user.email}</p>
          </div>
          <button
            className="btn btn--ghost btn--sm account-head__out"
            onClick={() => {
              logout();
              toast('Signed out. See you soon!');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </header>

        <div className="account-stats">
          <div className="info-card">
            <Package size={18} />
            <strong>{orders?.length ?? '–'}</strong>
            <span className="muted small">Orders</span>
          </div>
          <Link to="/wishlist" className="info-card">
            <Heart size={18} />
            <strong>{wishlist.length}</strong>
            <span className="muted small">Saved pieces</span>
          </Link>
          <Link to="/checkout" className="info-card">
            <ShoppingBag size={18} />
            <strong>{count}</strong>
            <span className="muted small">In your bag</span>
          </Link>
        </div>

        <div className="segmented segmented--lg account-tabs">
          {[
            ['orders', 'Orders'],
            ['addresses', 'Addresses'],
          ].map(([k, label]) => (
            <button key={k} className={tab === k ? 'is-active' : ''} onClick={() => setParams(k === 'orders' ? {} : { tab: k })}>
              {tab === k && <motion.span layoutId="account-tab" className="segmented__bg" />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === 'orders' ? <OrderList orders={orders} error={error} /> : <Addresses />}
      </div>
    </Page>
  );
}

function OrderList({ orders, error }) {
  if (error) return <p className="muted">{error}</p>;
  if (!orders) return <span className="spinner" />;
  if (orders.length === 0)
    return (
      <div className="empty">
        <h4>No orders yet</h4>
        <p className="muted">When you place an order, you can follow it here.</p>
        <Link to="/shop" className="btn btn--dark">
          Start shopping
        </Link>
      </div>
    );

  return (
    <ul className="my-orders">
      {orders.map((o, i) => (
        <motion.li key={o.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Link to={`/account/orders/${o.id}`} className="my-order">
            <div className="my-orders__imgs">
              {o.items.slice(0, 3).map((it, j) => (
                <img key={j} src={sized(it.image, 120)} alt="" />
              ))}
            </div>
            <span className="my-orders__info">
              <strong>{o.id}</strong>
              <small className="muted">
                {fmt(o.date)} · {o.items.reduce((s, it) => s + it.qty, 0)} items
              </small>
            </span>
            <StatusPill status={o.status} ret={o.return} />
            <strong>{formatPrice(o.total)}</strong>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

const PILL = {
  Pending: Clock,
  Processing: Package,
  Shipped: Truck,
  Delivered: CheckCircle2,
  Cancelled: XCircle,
};

function StatusPill({ status, ret }) {
  const label = ret && ret.status !== 'Rejected' ? `Return ${ret.status.toLowerCase()}` : status;
  const Icon = ret && ret.status !== 'Rejected' ? RotateCcw : (PILL[status] ?? Clock);
  return (
    <span className={`my-orders__status is-${status.toLowerCase()}`}>
      <Icon size={13} /> {label}
    </span>
  );
}

/* ------------------------------------------------------------------------- */
/* Saved addresses                                                            */
/* ------------------------------------------------------------------------- */
const BLANK = {
  label: 'Home',
  name: '',
  phone: '',
  address: '',
  city: 'Pune',
  state: 'Maharashtra',
  zip: '',
  country: 'India',
  isDefault: false,
};

function Addresses() {
  const { token, toast } = useStore();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | address id
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/account/addresses', { token })
      .then((d) => setList(d.addresses))
      .catch((err) => setError(err.message));
  }, [token]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d =
        editing === 'new'
          ? await api('/account/addresses', { method: 'POST', token, body: form })
          : await api(`/account/addresses/${editing}`, { method: 'PUT', token, body: form });
      setList(d.addresses);
      setEditing(null);
      toast('Address saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      const d = await api(`/account/addresses/${id}`, { method: 'DELETE', token });
      setList(d.addresses);
      toast('Address removed');
    } catch (err) {
      toast(err.message);
    }
  };

  if (!list) return error ? <p className="muted">{error}</p> : <span className="spinner" />;

  return (
    <div className="addresses">
      <div className="addresses__grid">
        {list.map((a) => (
          <div key={a.id} className={`address-card ${a.isDefault ? 'is-default' : ''}`}>
            <div className="address-card__head">
              <strong>
                <MapPin size={15} /> {a.label}
              </strong>
              {a.isDefault && <span className="pill-mini">Default</span>}
            </div>
            <p>
              {a.name} · {a.phone}
              <br />
              {a.address}, {a.city}, {a.state} {a.zip}
            </p>
            <div className="address-card__actions">
              <button
                className="link-btn"
                onClick={() => {
                  setForm({ ...BLANK, ...a });
                  setEditing(a.id);
                }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button className="link-btn" onClick={() => remove(a.id)}>
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
        {!editing && (
          <button
            className="address-card address-card--add"
            onClick={() => {
              setForm(BLANK);
              setEditing('new');
            }}
          >
            + Add an address
          </button>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.form
            className="address-form"
            onSubmit={save}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
            noValidate
          >
            <div className="form-grid">
              {[
                ['label', 'Label (Home, Office…)'],
                ['name', 'Full name'],
                ['phone', 'Phone'],
                ['address', 'Street address', 2],
                ['city', 'City'],
                ['state', 'State'],
                ['zip', 'PIN code'],
                ['country', 'Country'],
              ].map(([k, label, span]) => (
                <label key={k} className={`field ${span === 2 ? 'field--wide' : ''}`}>
                  <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder=" " />
                  <span className="field__label">{label}</span>
                </label>
              ))}
              <label className="check field--wide">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                Use as my default address
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="address-form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn--dark" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Save address'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* /account/orders/:id — tracking, invoice, returns, reviews                  */
/* ------------------------------------------------------------------------- */
const STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STEP_LABEL = { Pending: 'Order placed', Processing: 'Being prepared', Shipped: 'On its way', Delivered: 'Delivered' };
const REASONS = ['Damaged on arrival', 'Not as described', 'Changed my mind', 'Wrong item delivered', 'Other'];

export function OrderTracking() {
  const redirect = useRequireUser();
  const { id } = useParams();
  const { token } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api(`/orders/${id}`, { token })
      .then((d) => setOrder(d.order))
      .catch((err) => setError(err.message));
  }, [id, token]);

  if (redirect) return redirect;

  return (
    <Page className="track-page" label="Your order">
      <div className="container track">
        <Link to="/account" className="text-link back">
          <ArrowLeft size={16} /> All orders
        </Link>
        {error ? (
          <div className="empty empty--page">
            <h3>{error}</h3>
            <Link to="/account" className="btn btn--dark">
              Back to your orders
            </Link>
          </div>
        ) : !order ? (
          <span className="spinner" />
        ) : (
          <TrackingView order={order} onChange={setOrder} />
        )}
      </div>
    </Page>
  );
}

function TrackingView({ order, onChange }) {
  const cancelled = order.status === 'Cancelled';
  const reached = STEPS.indexOf(order.status);
  const deliveredAt = [...order.history].reverse().find((h) => h.status === 'Delivered')?.date;
  const daysLeft = deliveredAt ? Math.ceil(RETURN_WINDOW_DAYS - (Date.now() - new Date(deliveredAt)) / 864e5) : 0;
  const canReturn = order.status === 'Delivered' && daysLeft > 0 && (!order.return || order.return.status === 'Rejected');
  const stepTime = (s) => [...order.history].reverse().find((h) => h.status === s)?.date;

  return (
    <>
      <header className="track__head">
        <div>
          <p className="eyebrow">Placed {fmt(order.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="display">{order.id}</h1>
        </div>
        <a href={`/print/invoice/${order.id}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
          <FileText size={16} /> Invoice (PDF)
        </a>
      </header>

      {cancelled ? (
        <div className="notice-card is-cancelled">
          <XCircle size={20} /> This order was cancelled{order.history.at(-1)?.note ? `: ${order.history.at(-1).note}` : '.'}
        </div>
      ) : (
        <ol className="tracker" aria-label="Order progress">
          {STEPS.map((s, i) => {
            const done = i <= reached;
            return (
              <li key={s} className={`${done ? 'is-done' : ''} ${i === reached ? 'is-current' : ''}`}>
                <span className="tracker__dot">{done ? <Check size={14} /> : i + 1}</span>
                {i < STEPS.length - 1 && (
                  <span className="tracker__line">
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: i < reached ? 1 : 0 }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.25, ease }}
                    />
                  </span>
                )}
                <strong>{STEP_LABEL[s]}</strong>
                <small className="muted">{stepTime(s) ? fmtTime(stepTime(s)) : '—'}</small>
              </li>
            );
          })}
        </ol>
      )}

      <div className="track__grid">
        <section className="panel-soft">
          <h3>Items</h3>
          <ul className="track__items">
            {order.items.map((it, i) => (
              <li key={i}>
                <img src={sized(it.image, 160)} alt="" />
                <span>
                  <Link to={`/product/${it.id}`}>
                    <strong>{it.name}</strong>
                  </Link>
                  <small className="muted">
                    {it.qty} × {formatPrice(it.price)} · {it.color} · {it.material}
                  </small>
                  {order.status === 'Delivered' && (
                    <Link to={`/product/${it.id}#reviews`} className="link-btn">
                      <Star size={12} /> Write a review
                    </Link>
                  )}
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

        <aside className="track__side">
          <section className="panel-soft">
            <h3>Delivering to</h3>
            <p>
              {order.customer.name} · {order.customer.phone}
              <br />
              {order.customer.address}, {order.customer.city}, {order.customer.state} {order.customer.zip}
            </p>
          </section>

          {order.return && <ReturnStatus ret={order.return} />}
          {canReturn && <ReturnRequest order={order} daysLeft={daysLeft} onDone={onChange} />}

          <section className="panel-soft">
            <h3>History</h3>
            <ol className="history">
              {[...order.history].reverse().map((h, i) => (
                <li key={i}>
                  <strong>{STEP_LABEL[h.status] ?? h.status}</strong>
                  <small className="muted">{fmtTime(h.date)}</small>
                  {h.note && <span className="history__note">{h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}

function ReturnStatus({ ret }) {
  const copy = {
    Requested: 'We’ve received your return request and will reply within 2 business days.',
    Approved: 'Your return is approved. Our team will contact you to arrange pickup.',
    Rejected: 'Your return request wasn’t approved.',
    Refunded: `Refunded ${ret.refundAmount ? formatPrice(ret.refundAmount) : ''} to your original payment method.`,
  };
  return (
    <section className={`panel-soft return-status is-${ret.status.toLowerCase()}`}>
      <h3>
        <RotateCcw size={16} /> Return {ret.status.toLowerCase()}
      </h3>
      <p>{copy[ret.status]}</p>
      <p className="muted small">Reason: {ret.reason}</p>
      {ret.adminNote && <p className="history__note">“{ret.adminNote}”</p>}
    </section>
  );
}

function ReturnRequest({ order, daysLeft, onDone }) {
  const { token, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/account/orders/${order.id}/return`, { method: 'POST', token, body: { reason, details } });
      const { order: fresh } = await api(`/orders/${order.id}`, { token });
      onDone(fresh);
      toast('Return requested. We’ll be in touch soon.');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel-soft">
      <h3>
        <RotateCcw size={16} /> Need to return this?
      </h3>
      <p className="muted small">
        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your 30-day return window. <Link to="/returns">Return policy →</Link>
      </p>
      {!open ? (
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
          Request a return
        </button>
      ) : (
        <form onSubmit={submit} className="return-form">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="admin-select" aria-label="Reason">
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <label className="field">
            <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder=" " maxLength={600} />
            <span className="field__label">Anything we should know? (optional)</span>
          </label>
          <button className="btn btn--dark btn--sm" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Send request'}
          </button>
        </form>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Forgot / reset password                                                    */
/* ------------------------------------------------------------------------- */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult(await api('/auth/forgot', { method: 'POST', body: { email } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="auth-simple" label="Reset password">
      <div className="container auth-simple__box">
        <p className="eyebrow">Account help</p>
        <h1 className="display">Forgot your password?</h1>
        {result ? (
          <div className="notice-card">
            <p>{result.message}</p>
            {result.devResetUrl ? (
              <p className="muted small">
                Development mode — no email service is set up, so here is the link:{' '}
                <Link to={result.devResetUrl} className="link-btn">
                  Reset my password →
                </Link>
              </p>
            ) : (
              <p className="muted small">No email arrived? Contact us and we’ll send you a reset link.</p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="muted">Enter your account email and we’ll create a link to choose a new password.</p>
            <label className="field">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " autoComplete="email" />
              <span className="field__label">Email</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn--accent btn--block" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create reset link'}
            </button>
          </form>
        )}
        <Link to="/login" className="text-link">
          <ArrowLeft size={16} /> Back to log in
        </Link>
      </div>
    </Page>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { toast, setSession } = useStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('The two passwords don’t match');
    setBusy(true);
    setError('');
    try {
      setSession(await api('/auth/reset', { method: 'POST', body: { token, password } }));
      toast('Password updated — you’re signed in.');
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="auth-simple" label="New password">
      <div className="container auth-simple__box">
        <p className="eyebrow">Account help</p>
        <h1 className="display">Choose a new password.</h1>
        {!token ? (
          <p className="form-error">This link is missing its token. Please request a new one.</p>
        ) : (
          <form onSubmit={submit} noValidate>
            <label className="field">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
              />
              <span className="field__label">New password</span>
            </label>
            <label className="field">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
              />
              <span className="field__label">Confirm new password</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn--accent btn--block" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Save new password'}
            </button>
          </form>
        )}
        <Link to="/forgot-password" className="text-link">
          Request a new link
        </Link>
      </div>
    </Page>
  );
}
