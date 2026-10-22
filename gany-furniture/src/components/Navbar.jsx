import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Heart, Moon, Search, ShoppingBag, Sun, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ease } from './motion';

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop/seating', label: 'Seating' },
  { to: '/shop/tables', label: 'Tables' },
  { to: '/shop/lighting', label: 'Lighting' },
  { to: '/about', label: 'Story' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { count, wishlist, setCartOpen, setSearchOpen, theme, toggleTheme, user } = useStore();
  const { pathname } = useLocation();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide while scrolling down, reveal on any upward scroll.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 300 && !menuOpen);
    setScrolled(y > 40);
  });

  useEffect(() => setMenuOpen(false), [pathname]);

  // Global ⌘K / Ctrl+K opens search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  const overHero = pathname === '/' && !scrolled && !menuOpen;

  return (
    <>
      <motion.header
        className={`nav ${scrolled ? 'nav--scrolled' : ''} ${overHero ? 'nav--hero' : ''}`}
        animate={{ y: hidden ? '-120%' : '0%' }}
        transition={{ duration: 0.5, ease }}
      >
        <Link to="/" className="nav__logo">
          Gany's<span>.</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end className="nav__link">
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <motion.span layoutId="nav-underline" className="nav__underline" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="nav__actions">
          <button className="icon-btn search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search (⌘K)">
            <Search size={18} />
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'grid' }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <Link to="/wishlist" className="icon-btn hide-sm" aria-label="Wishlist">
            <Heart size={18} />
            {wishlist.length > 0 && <span className="badge-dot">{wishlist.length}</span>}
          </Link>
          <Link to="/login" className="icon-btn hide-sm" aria-label="Account">
            {user ? <span className="avatar">{user.name[0].toUpperCase()}</span> : <User size={18} />}
          </Link>
          <button className="icon-btn" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}>
            <ShoppingBag size={18} />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  className="badge-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            className={`burger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ clipPath: 'circle(0% at 100% 0%)' }}
            animate={{ clipPath: 'circle(150% at 100% 0%)' }}
            exit={{ clipPath: 'circle(0% at 100% 0%)' }}
            transition={{ duration: 0.7, ease }}
          >
            <nav>
              {[...LINKS, { to: '/wishlist', label: 'Wishlist' }, { to: '/login', label: user ? 'Account' : 'Log in' }].map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease }}
                >
                  <Link to={l.to} className="mobile-menu__link">
                    <small>0{i + 1}</small>
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <p className="mobile-menu__foot">Pune, Maharashtra · ganeshpwayal@gmail.com</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
