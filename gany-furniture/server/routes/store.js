import { Router } from 'express';
import { db, hydrateOrders, newOrderId, saveOrder } from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';
import { PAYMENT_METHODS, PricingError, priceOrder } from '../pricing.js';
import { body, messageSchema, orderSchema, subscribeSchema } from '../validate.js';

const router = Router();

/** Place an order. Works for guests; linked to the account when logged in. */
router.post('/orders', optionalAuth, body(orderSchema), (req, res) => {
  const { customer, items, method, payment } = req.body;
  let priced;
  try {
    priced = priceOrder(items, method);
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message });
    throw err;
  }

  const order = {
    id: newOrderId(),
    user_id: req.user?.id ?? null,
    status: 'Pending',
    ...customer,
    method: priced.method,
    payment: PAYMENT_METHODS[payment],
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    gst: priced.gst,
    total: priced.total,
    demo: 0,
    created_at: new Date().toISOString(),
    items: priced.lines,
  };
  saveOrder(order);

  const [saved] = hydrateOrders(db.prepare('SELECT * FROM orders WHERE id = ?').all(order.id));
  res.status(201).json({ order: saved });
});

/** The logged-in customer's own orders. */
router.get('/orders/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ orders: hydrateOrders(rows) });
});

router.post('/messages', body(messageSchema), (req, res) => {
  const { name, email, topic, message } = req.body;
  db.prepare('INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)').run(name, email, topic, message);
  res.status(201).json({ ok: true });
});

router.post('/subscribers', body(subscribeSchema), (req, res) => {
  // Subscribing twice is fine — no error, no duplicate.
  db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(req.body.email);
  res.status(201).json({ ok: true });
});

export default router;
