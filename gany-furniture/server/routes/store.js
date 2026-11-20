import { Router } from 'express';
import { StockError, db, getOrder, hydrateOrders, newOrderId, now, saveOrder } from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { PAYMENT_METHODS, PricingError, applyCoupon, priceOrder } from '../pricing.js';
import { body, couponCheckSchema, messageSchema, orderSchema, subscribeSchema } from '../validate.js';

const router = Router();

/** Place an order. Works for guests; linked to the account (and optionally saves the address) when logged in. */
router.post('/orders', optionalAuth, body(orderSchema), (req, res) => {
  const { customer, items, method, payment, coupon, saveAddress } = req.body;
  let priced;
  try {
    priced = priceOrder(items, method, coupon || null);
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message, field: err.field });
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
    discount: priced.discount,
    coupon_code: priced.coupon?.code ?? null,
    shipping: priced.shipping,
    gst: priced.gst,
    total: priced.total,
    demo: 0,
    created_at: now(),
    items: priced.lines,
  };

  try {
    saveOrder(order);
  } catch (err) {
    if (err instanceof StockError) return res.status(409).json({ error: err.message });
    throw err;
  }

  if (req.user && saveAddress) {
    const { name, phone, address, city, state, zip, country } = customer;
    const exists = db.prepare('SELECT 1 FROM addresses WHERE user_id = ? AND address = ? AND zip = ?').get(req.user.id, address, zip);
    if (!exists) {
      const first = !db.prepare('SELECT 1 FROM addresses WHERE user_id = ?').get(req.user.id);
      db.prepare(
        'INSERT INTO addresses (user_id, label, name, phone, address, city, state, zip, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(req.user.id, 'Home', name, phone, address, city, state, zip, country, first ? 1 : 0);
    }
  }

  const saved = getOrder(order.id);
  notifyAdmins('order', { id: saved.id, name: saved.customer.name, total: saved.total });
  res.status(201).json({ order: saved });
});

/** Check a discount code against the current bag before placing the order. */
router.post('/coupons/check', body(couponCheckSchema), (req, res) => {
  try {
    const { subtotal } = priceOrder(req.body.items, 'ground', null, { checkStock: false });
    res.json(applyCoupon(req.body.code, subtotal));
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message, field: 'coupon' });
    throw err;
  }
});

/** The logged-in customer's own orders. */
router.get('/orders/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ orders: hydrateOrders(rows) });
});

/** One order, visible to its owner (or an admin). */
router.get('/orders/:id', requireAuth, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order || (order.userId !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

router.post('/messages', body(messageSchema), (req, res) => {
  const { name, email, topic, message } = req.body;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)')
    .run(name, email, topic, message);
  notifyAdmins('message', { id: lastInsertRowid, name, topic });
  res.status(201).json({ ok: true });
});

router.post('/subscribers', body(subscribeSchema), (req, res) => {
  // Subscribing twice is fine — no error, no duplicate.
  db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(req.body.email);
  res.status(201).json({ ok: true });
});

export default router;
