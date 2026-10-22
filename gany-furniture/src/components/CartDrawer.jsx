import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { FREE_SHIPPING_AT, formatPrice, sized } from '../data/products';
import { useScrollLock } from '../hooks/useLenis';
import { ease } from './motion';

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, subtotal, count, setQty, removeLine } = useStore();
  const navigate = useNavigate();
  useScrollLock(cartOpen);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCartOpen]);

  const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal);
  const progress = Math.min(1, subtotal / FREE_SHIPPING_AT);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
          />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease }}
            data-lenis-prevent
          >
            <header className="drawer__head">
              <h3>
                Your bag <sup>{count}</sup>
              </h3>
              <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag">
                <X size={20} />
              </button>
            </header>

            {lines.length > 0 && (
              <div className="ship-meter">
                <p>
                  <Truck size={16} />
                  {remaining > 0 ? (
                    <>
                      You're <strong>{formatPrice(remaining)}</strong> away from free white-glove delivery
                    </>
                  ) : (
                    <>You've unlocked free white-glove delivery 🎉</>
                  )}
                </p>
                <div className="ship-meter__track">
                  <motion.div
                    className="ship-meter__fill"
                    initial={false}
                    animate={{ scaleX: progress }}
                    transition={{ duration: 0.8, ease }}
                  />
                </div>
              </div>
            )}

            <div className="drawer__body">
              {lines.length === 0 ? (
                <motion.div className="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <ShoppingBag size={42} strokeWidth={1} />
                  <h4>Your bag is empty</h4>
                  <p>Beautiful things are waiting to come home with you.</p>
                  <button
                    className="btn btn--dark"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/shop');
                    }}
                  >
                    Start exploring
                  </button>
                </motion.div>
              ) : (
                <ul className="cart-lines">
                  <AnimatePresence initial={false}>
                    {lines.map((l, i) => (
                      <motion.li
                        key={l.key}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                        exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.4, ease }}
                        className="cart-line"
                      >
                        <Link to={`/product/${l.id}`} onClick={() => setCartOpen(false)} className="cart-line__img">
                          <img src={sized(l.product.image, 240)} alt={l.product.name} />
                        </Link>
                        <div className="cart-line__info">
                          <Link to={`/product/${l.id}`} onClick={() => setCartOpen(false)}>
                            <h5>{l.product.name}</h5>
                          </Link>
                          <p className="muted">
                            {l.color} · {l.material}
                          </p>
                          <div className="cart-line__row">
                            <div className="stepper">
                              <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease">
                                <Minus size={14} />
                              </button>
                              <motion.span key={l.qty} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                                {l.qty}
                              </motion.span>
                              <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase">
                                <Plus size={14} />
                              </button>
                            </div>
                            <strong>{formatPrice(l.product.price * l.qty)}</strong>
                          </div>
                        </div>
                        <button className="cart-line__remove" onClick={() => removeLine(l.key)} aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <footer className="drawer__foot">
                <div className="drawer__total">
                  <span>Subtotal</span>
                  <motion.strong key={subtotal} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    {formatPrice(subtotal)}
                  </motion.strong>
                </div>
                <p className="muted small">Taxes and delivery calculated at checkout.</p>
                <button
                  className="btn btn--accent btn--block"
                  onClick={() => {
                    setCartOpen(false);
                    navigate('/checkout');
                  }}
                >
                  Checkout securely
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
