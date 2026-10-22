import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { sized } from '../data/products';

export default function Toasts() {
  const { toasts, dismissToast, setCartOpen } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {t.image && <img src={sized(t.image, 120)} alt="" />}
            <p>{t.message}</p>
            {t.action === 'cart' && (
              <button
                className="toast__action"
                onClick={() => {
                  setCartOpen(true);
                  dismissToast(t.id);
                }}
              >
                View bag
              </button>
            )}
            <button className="toast__close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
