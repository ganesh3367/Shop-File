import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { Eye, Heart, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice, sized } from '../data/products';
import QuickView from './QuickView';
import { ease } from './motion';

// forwardRef so <AnimatePresence mode="popLayout"> can measure the card on exit.
const ProductCard = forwardRef(function ProductCard({ product, index = 0, variant = 'grid' }, ref) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const [quick, setQuick] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wished = isWished(product.id);

  // Subtle 3D tilt + moving glare that follows the pointer.
  const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });
  const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.22), transparent 55%)`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 10);
    rx.set((0.5 - py) * 10);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.article
      ref={ref}
      className={`card card--${variant}`}
      layout
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 0.7, ease, delay: (index % 4) * 0.08 }}
    >
      <motion.div
        className="card__media"
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <Link to={`/product/${product.id}`} aria-label={product.name}>
          <div className={`skeleton ${loaded ? 'is-loaded' : ''}`} />
          <img
            src={sized(product.image, 700)}
            alt={product.name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={loaded ? 'is-loaded' : ''}
          />
          <motion.div className="card__glare" style={{ background: glare }} />
        </Link>

        {product.badge && <span className={`tag tag--${product.badge.toLowerCase()}`}>{product.badge}</span>}

        <motion.button
          className={`card__wish ${wished ? 'is-on' : ''}`}
          onClick={() => toggleWishlist(product)}
          whileTap={{ scale: 0.8 }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={String(wished)}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.35 }}
              style={{ display: 'grid' }}
            >
              <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div className="card__actions">
          <button onClick={() => setQuick(true)}>
            <Eye size={15} /> Quick view
          </button>
          <button onClick={() => addToCart(product)} className="card__add">
            <Plus size={15} /> Add
          </button>
        </div>
      </motion.div>

      <div className="card__body">
        <div>
          <p className="card__type">{product.type}</p>
          <Link to={`/product/${product.id}`}>
            <h3 className="card__name">{product.name}</h3>
          </Link>
        </div>
        <div className="card__price">
          {product.compareAt && <s>{formatPrice(product.compareAt)}</s>}
          <span>{formatPrice(product.price)}</span>
        </div>
      </div>
      <div className="card__swatches">
        {product.colors.map((c) => (
          <span key={c.name} style={{ background: c.hex }} title={c.name} />
        ))}
        <span className="card__rating">★ {product.rating}</span>
      </div>
      <QuickView product={product} open={quick} onClose={() => setQuick(false)} />
    </motion.article>
  );
});

export default ProductCard;
