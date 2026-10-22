import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLenis } from './hooks/useLenis';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Preloader from './components/Preloader';
import CartDrawer from './components/CartDrawer';
import SearchPalette from './components/SearchPalette';
import Toasts from './components/Toasts';
import ScrollProgress from './components/ScrollProgress';
import Cursor from './components/Cursor';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import About from './pages/About';
import Careers from './pages/Careers';
import Contact from './pages/Contact';
import Help from './pages/Help';
import Returns from './pages/Returns';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// The admin panel is its own bundle so shoppers never download it.
const Admin = lazy(() => import('./admin/Admin'));

export default function App() {
  const location = useLocation();
  const lenis = useLenis();
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('gany-intro-seen');
    } catch {
      return true;
    }
  });

  // Jump to top on every route change — after the exit animation finishes.
  const onExitComplete = () => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (lenis.current) loading ? lenis.current.stop() : lenis.current.start();
  }, [loading, lenis]);

  const finishIntro = () => {
    try {
      sessionStorage.setItem('gany-intro-seen', '1');
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  if (location.pathname.startsWith('/admin')) {
    return (
      <>
        <Cursor />
        <Toasts />
        <Suspense fallback={<div className="admin-loading" />}>
          <Admin />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>{loading && <Preloader onDone={finishIntro} />}</AnimatePresence>
      <Cursor />
      <ScrollProgress />
      <Navbar />
      <CartDrawer />
      <SearchPalette />
      <Toasts />

      <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
        {/* All /shop/* routes share a key so switching category animates in place instead of a full page wipe. */}
        <Routes location={location} key={location.pathname.startsWith('/shop') ? '/shop' : location.pathname}>
          <Route path="/" element={<Home ready={!loading} />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>

      <Footer />
    </>
  );
}
