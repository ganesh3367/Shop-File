import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { Page, SplitText } from '../components/motion';

export default function Wishlist() {
  const { wishlist, addToCart, toast } = useStore();
  const items = wishlist.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);

  const addAll = () => {
    items.forEach((p) => addToCart(p, { silent: true }));
    toast(`${items.length} saved pieces added to your bag`, { action: 'cart' });
  };

  return (
    <Page className="wishlist" label="Wishlist">
      <header className="container page-hero">
        <p className="eyebrow">Saved for later</p>
        <SplitText as="h1" className="mega" text="Wishlist" delay={0.3} />
        {items.length > 0 && (
          <motion.div className="page-hero__row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <p className="muted">
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} you love
            </p>
            <button className="btn btn--dark" onClick={addAll}>
              Add all to bag
            </button>
          </motion.div>
        )}
      </header>

      <section className="container shop__results">
        {items.length === 0 ? (
          <motion.div
            className="empty empty--page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <Heart size={48} strokeWidth={1} />
            </motion.span>
            <h3>Nothing saved yet</h3>
            <p className="muted">Tap the heart on any piece to keep it here.</p>
            <Link to="/shop" className="btn btn--dark">
              Discover pieces
            </Link>
          </motion.div>
        ) : (
          <motion.div className="grid" layout>
            <AnimatePresence mode="popLayout">
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </Page>
  );
}
