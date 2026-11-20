import { StockError, db, getOrder, hydrateOrders, newOrderId, now, saveOrder } from '../db.js';
import { asyncRouter } from '../http.js';
import { optionalAuth, requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { PAYMENT_METHODS, PricingError, applyCoupon, priceOrder } from '../pricing.js';
import { body, couponCheckSchema, messageSchema, orderSchema, subscribeSchema } from '../validate.js';

const router = asyncRouter();

/** Place an order. Works for guests; linked to the account (and optionally saves the address) when logged in. */
router.post('/orders', optionalAuth, body(orderSchema), async (req, res) => {
  const { customer, items, method, payment, coupon, saveAddress } = req.body;
  let priced;
  try {
    priced = await priceOrder(items, method, coupon || null);
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message, field: err.field });
    throw err;
  }

  const order = {
    id: await newOrderId(),
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
    await saveOrder(order);
  } catch (err) {
    if (err instanceof StockError) return res.status(409).json({ error: err.message });
    throw err;
  }

  if (req.user && saveAddress) {
    const { name, phone, address, city, state, zip, country } = customer;
    const exists = await db.get('SELECT 1 AS x FROM addresses WHERE user_id = ? AND address = ? AND zip = ?', req.user.id, address, zip);
    if (!exists) {
      const first = !(await db.get('SELECT 1 AS x FROM addresses WHERE user_id = ?', req.user.id));
      await db.run(
        'INSERT INTO addresses (user_id, label, name, phone, address, city, state, zip, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        req.user.id,
        'Home',
        name,
        phone,
        address,
        city,
        state,
        zip,
        country,
        first ? 1 : 0,
      );
    }
  }

  const saved = await getOrder(order.id);
  notifyAdmins('order', { id: saved.id, name: saved.customer.name, total: saved.total });
  res.status(201).json({ order: saved });
});

/** Check a discount code against the current bag before placing the order. */
router.post('/coupons/check', body(couponCheckSchema), async (req, res) => {
  try {
    const { subtotal } = await priceOrder(req.body.items, 'ground', null, { checkStock: false });
    res.json(await applyCoupon(req.body.code, subtotal));
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message, field: 'coupon' });
    throw err;
  }
});

/** The logged-in customer's own orders. */
router.get('/orders/mine', requireAuth, async (req, res) => {
  const rows = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', req.user.id);
  res.json({ orders: await hydrateOrders(rows) });
});

/** One order, visible to its owner (or an admin). */
router.get('/orders/:id', requireAuth, async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order || (order.userId !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

router.post('/messages', body(messageSchema), async (req, res) => {
  const { name, email, topic, message } = req.body;
  const { lastInsertRowid } = await db.run(
    'INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)',
    name,
    email,
    topic,
    message,
  );
  notifyAdmins('message', { id: lastInsertRowid, name, topic });
  res.status(201).json({ ok: true });
});

router.post('/subscribers', body(subscribeSchema), async (req, res) => {
  // Subscribing twice is fine — no error, no duplicate.
  await db.run('INSERT OR IGNORE INTO subscribers (email) VALUES (?)', req.body.email);
  res.status(201).json({ ok: true });
});

export default router;
