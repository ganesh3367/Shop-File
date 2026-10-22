import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice, sized } from '../data/products';
import { useScrollLock } from '../hooks/useLenis';
import { ease } from './motion';

export default function QuickView({ product, open, onClose }) {
  const { addToCart } = useStore();
  const [color, setColor] = useState(product.colors[0].name);
  const [material, setMaterial] = useState(product.materials[0]);
  const [added, setAdded] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const add = () => {
    addToCart(product, { color, material });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal quick"
            role="dialog"
            aria-label={`Quick view: ${product.name}`}
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.5, ease }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <button className="icon-btn modal__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
            <div className="quick__media">
              <motion.img
                src={sized(product.image, 1000)}
                alt={product.name}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, ease }}
              />
            </div>
            <div className="quick__info">
              <p className="eyebrow">{product.type}</p>
              <h2>{product.name}</h2>
              <p className="quick__price">
                {product.compareAt && <s>{formatPrice(product.compareAt)}</s>} {formatPrice(product.price)}
              </p>
              <p className="muted">{product.story}</p>

              <div className="option">
                <span className="option__label">
                  Colour: <strong>{color}</strong>
                </span>
                <div className="swatches">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      className={`swatch ${color === c.name ? 'is-active' : ''}`}
                      style={{ '--sw': c.hex }}
                      onClick={() => setColor(c.name)}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="option">
                <span className="option__label">Material</span>
                <div className="segmented">
                  {product.materials.map((m) => (
                    <button key={m} className={material === m ? 'is-active' : ''} onClick={() => setMaterial(m)}>
                      {material === m && <motion.span layoutId={`qv-mat-${product.id}`} className="segmented__bg" />}
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={`btn btn--accent btn--block ${added ? 'is-done' : ''}`}
                onClick={add}
                disabled={added || product.stock <= 0}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={String(added)}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    className="btn__inner"
                  >
                    {added ? (
                      <>
                        <Check size={18} /> Added
                      </>
                    ) : (
                      <>{product.stock <= 0 ? 'Sold out' : `Add to bag · ${formatPrice(product.price)}`}</>
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
              <Link to={`/product/${product.id}`} className="text-link" onClick={onClose}>
                View full details <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
