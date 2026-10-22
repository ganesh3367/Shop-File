import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, LogOut } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { formatPrice, sized } from '../data/products';
import { Page, ease } from '../components/motion';

export default function Login() {
  const { user, token, login, signup, logout, toast, wishlist, count } = useStore();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Password strength: length, mixed case, digit, symbol.
  const strength = [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length;

  const submit = async (e) => {
    e.preventDefault();
    let msg = '';
    if (mode === 'signup' && form.name.trim().length < 2) msg = 'Please tell us your name';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) msg = 'Enter a valid email address';
    else if (form.password.length < 6) msg = 'Password must be at least 6 characters';
    if (msg) {
      setError(msg);
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    try {
      const u = mode === 'signup' ? await signup(form) : await login({ email: form.email, password: form.password });
      toast(`Welcome${mode === 'signup' ? '' : ' back'}, ${u.name.split(' ')[0]}!`);
      navigate(u.role === 'admin' ? '/admin' : '/shop');
    } catch (err) {
      setError(err.message);
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <Page className="auth" label="Account">
        <div className="container account">
          <motion.span
            className="avatar avatar--xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.4 }}
          >
            {user.name[0].toUpperCase()}
          </motion.span>
          <h1 className="display">Hello, {user.name}.</h1>
          <p className="muted">{user.email}</p>
          <MyOrders token={token} />
          <div className="account__stats">
            <Link to="/wishlist" className="info-card">
              <strong>{wishlist.length}</strong>
              <span className="muted small">Saved pieces</span>
            </Link>
            <Link to="/checkout" className="info-card">
              <strong>{count}</strong>
              <span className="muted small">Items in bag</span>
            </Link>
          </div>
          <button
            className="btn btn--ghost"
            onClick={() => {
              logout();
              toast('Signed out. See you soon!');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page className="auth" label={mode === 'login' ? 'Log in' : 'Sign up'}>
      <div className="auth__grid">
        <div className="auth__visual">
          <motion.img src="/media/auth.jpg" alt="" initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease }} />
          <div className="auth__quote">
            <p>“A house becomes a home with the things you choose to live with.”</p>
            <span>Gany's Furniture</span>
          </div>
        </div>

        <div className="auth__panel">
          <motion.div className="auth__box" key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
            <div className="segmented segmented--lg segmented--full">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  className={mode === m ? 'is-active' : ''}
                  onClick={() => {
                    setMode(m);
                    setError('');
                  }}
                >
                  {mode === m && <motion.span layoutId="auth-tab" className="segmented__bg" />}
                  <span>{m === 'login' ? 'Log in' : 'Create account'}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.h1
                key={mode}
                className="display"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                {mode === 'login' ? 'Welcome back.' : 'Join the studio.'}
              </motion.h1>
            </AnimatePresence>

            <form onSubmit={submit} noValidate>
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.label
                    className="field"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                  >
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder=" "
                      autoComplete="name"
                    />
                    <span className="field__label">Full name</span>
                  </motion.label>
                )}
              </AnimatePresence>
              <label className="field">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder=" "
                  autoComplete="email"
                />
                <span className="field__label">Email</span>
              </label>
              <label className="field">
                <input
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder=" "
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <span className="field__label">Password</span>
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              {mode === 'signup' && form.password && (
                <div className="strength" data-level={strength}>
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span key={i} animate={{ scaleX: i < strength ? 1 : 0 }} transition={{ duration: 0.3 }} />
                  ))}
                  <small>{['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][strength]}</small>
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="form-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button className="btn btn--accent btn--block" disabled={busy}>
                {busy ? <span className="spinner" /> : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
              <p className="muted small center">
                {mode === 'login'
                  ? 'New here? Create an account to track your orders.'
                  : 'Your password is stored securely (hashed), never in plain text.'}
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </Page>
  );
}

/** The signed-in customer's order history, straight from the API. */
function MyOrders({ token }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders/mine', { token })
      .then((d) => setOrders(d.orders))
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="muted">{error}</p>;
  if (!orders) return <span className="spinner" />;
  if (orders.length === 0)
    return (
      <p className="muted">
        No orders yet. <Link to="/shop">Start shopping →</Link>
      </p>
    );

  return (
    <div className="my-orders">
      <h3>Your orders</h3>
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            <div className="my-orders__imgs">
              {o.items.slice(0, 3).map((it, i) => (
                <img key={i} src={sized(it.image, 120)} alt="" />
              ))}
            </div>
            <span className="my-orders__info">
              <strong>{o.id}</strong>
              <small className="muted">
                {new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.items.length}{' '}
                {o.items.length === 1 ? 'item' : 'items'}
              </small>
            </span>
            <span className={`my-orders__status is-${o.status.toLowerCase()}`}>{o.status}</span>
            <strong>{formatPrice(o.total)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
