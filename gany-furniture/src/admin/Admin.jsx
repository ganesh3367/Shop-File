import { useCallback, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BarChart3,
  Bell,
  BellOff,
  Boxes,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Package,
  RotateCcw,
  Star,
  Sun,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api, adminToken } from '../lib/api';
import { AdminDataProvider, useAdmin } from './data';
import Dashboard from './Dashboard';
import Orders from './Orders';
import Products from './Products';
import Customers from './Customers';
import Messages from './Messages';
import Analytics from './Analytics';
import Returns from './Returns';
import Reviews from './Reviews';
import Coupons from './Coupons';
import ActivityLog from './Activity';
import CustomerProfile from './CustomerProfile';
import '../styles/admin.css';

export default function Admin() {
  const [token, setToken] = useState(adminToken.get);
  const signOut = useCallback(() => {
    adminToken.set(null);
    setToken(null);
  }, []);

  if (!token) return <AdminLogin onSuccess={(t) => (adminToken.set(t), setToken(t))} />;
  return (
    <AdminDataProvider token={token} onUnauthorized={signOut}>
      <AdminLayout onLogout={signOut} />
    </AdminDataProvider>
  );
}

function AdminLogin({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      if (user.role !== 'admin') throw new Error('This account does not have admin access');
      onSuccess(token);
    } catch (err) {
      setError(err.message);
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="admin-gate">
      <motion.form
        className="admin-gate__box"
        onSubmit={submit}
        initial={{ opacity: 0, y: 24 }}
        animate={shake ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        key={shake}
        noValidate
      >
        <Link to="/" className="nav__logo">
          Gany's<span>.</span>
        </Link>
        <h1>Admin</h1>
        <p className="muted">Sign in to manage orders, products and customers.</p>
        <label className="field">
          <input type="email" value={form.email} onChange={set('email')} placeholder=" " autoFocus autoComplete="username" />
          <span className="field__label">Admin email</span>
        </label>
        <label className={`field ${error ? 'has-error' : ''}`}>
          <input type="password" value={form.password} onChange={set('password')} placeholder=" " autoComplete="current-password" />
          <span className="field__label">Password</span>
          {error && <small className="field__error">{error}</small>}
        </label>
        <button className="btn btn--dark btn--block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Enter dashboard'}
        </button>
        {import.meta.env.DEV && (
          <p className="muted small center">
            Dev admin: <code>admin@ganys.in</code> / <code>gany@admin</code>
          </p>
        )}
      </motion.form>
    </div>
  );
}

function AdminLayout({ onLogout }) {
  const { theme, toggleTheme } = useStore();
  const { orders, messages, returns, reviews, products, lowStock, loading, error, reload, live, sound, setSound } = useAdmin();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  // Animate between sections, not between an order list and one of its orders.
  const section = location.pathname.split('/')[2] ?? 'dashboard';
  const pending = orders.filter((o) => o.status === 'Pending').length;
  const unread = messages.filter((m) => !m.read).length;
  const openReturns = returns.filter((r) => r.status === 'Requested').length;
  const pendingReviews = reviews.filter((r) => r.status === 'Pending').length;
  const low = products.filter((p) => p.active && p.stock <= lowStock).length;

  const groups = [
    [
      'Overview',
      [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    ],
    [
      'Sales',
      [
        { to: '/admin/orders', label: 'Orders', icon: Package, badge: pending },
        { to: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: openReturns },
        { to: '/admin/coupons', label: 'Discount codes', icon: Ticket },
      ],
    ],
    [
      'Catalogue',
      [
        { to: '/admin/products', label: 'Products', icon: Boxes, badge: low, warn: true },
        { to: '/admin/reviews', label: 'Reviews', icon: Star, badge: pendingReviews },
      ],
    ],
    [
      'People',
      [
        { to: '/admin/customers', label: 'Customers', icon: Users },
        { to: '/admin/messages', label: 'Messages', icon: Mail, badge: unread },
        { to: '/admin/activity', label: 'Activity log', icon: ActivityIcon },
      ],
    ],
  ];

  return (
    <div className={`admin ${navOpen ? 'is-nav-open' : ''}`}>
      <aside className="admin__side">
        <div className="admin__brand">
          <Link to="/admin" className="nav__logo">
            Gany's<span>.</span>
          </Link>
          <span className="admin__tag">Admin</span>
          <button className="icon-btn admin__close" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="admin__nav" data-lenis-prevent>
          {groups.map(([title, links]) => (
            <div key={title} className="admin__group">
              <span className="admin__group-title">{title}</span>
              {links.map(({ to, label, icon: Icon, end, badge, warn }) => (
                <NavLink key={to} to={to} end={end} className="admin__link" onClick={() => setNavOpen(false)}>
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{label}</span>
                  {badge > 0 && (
                    <em className={warn ? 'is-warn' : ''} title={warn ? 'Low on stock' : undefined}>
                      {badge}
                    </em>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin__side-foot">
          <Link to="/" className="admin__link">
            <ArrowUpRight size={18} strokeWidth={1.6} />
            <span>View store</span>
          </Link>
          <button className="admin__link" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.6} /> : <Moon size={18} strokeWidth={1.6} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button className="admin__link" onClick={onLogout}>
            <LogOut size={18} strokeWidth={1.6} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      {navOpen && <div className="admin__scrim" onClick={() => setNavOpen(false)} />}

      <div className="admin__main">
        <header className="admin__top">
          <button className="icon-btn admin__burger" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className={`live-pill ${live ? 'is-on' : ''}`} title={live ? 'Receiving live updates' : 'Reconnecting…'}>
            <span /> {live ? 'Live' : 'Offline'}
          </span>
          <button
            className="icon-btn"
            onClick={() => setSound(!sound)}
            aria-label={sound ? 'Mute new-order sound' : 'Play a sound for new orders'}
            title="New-order sound"
          >
            {sound ? <Bell size={17} /> : <BellOff size={17} />}
          </button>
          <span className="muted small hide-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <span className="avatar">A</span>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            className="admin__content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error && (
              <div className="notice notice--error">
                <span>{error}</span>
                <button className="link-btn" onClick={reload}>
                  Try again
                </button>
              </div>
            )}
            {loading ? (
              <div className="admin-spinner">
                <span className="spinner" />
              </div>
            ) : (
              <Routes location={location}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/orders" element={<Orders />} />
                <Route path="/admin/orders/:id" element={<Orders />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/returns" element={<Returns />} />
                <Route path="/admin/coupons" element={<Coupons />} />
                <Route path="/admin/products" element={<Products />} />
                <Route path="/admin/reviews" element={<Reviews />} />
                <Route path="/admin/customers" element={<Customers />} />
                <Route path="/admin/customers/:email" element={<CustomerProfile />} />
                <Route path="/admin/messages" element={<Messages />} />
                <Route path="/admin/activity" element={<ActivityLog />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
