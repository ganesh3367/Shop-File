import { Router } from 'express';
import {
  StockError,
  addOrderEvent,
  allOrders,
  db,
  getOrder,
  getProductRow,
  hydrateOrders,
  logActivity,
  now,
  productFromRow,
  restock,
  returnFromRow,
  saveOrder,
  unrestock,
} from '../db.js';
import { requireAdmin } from '../auth.js';
import { bus } from '../events.js';
import { imageUpload, modelUpload, publicPath } from '../uploads.js';
import {
  body,
  couponSchema,
  productSchema,
  readSchema,
  returnDecisionSchema,
  reviewStatusSchema,
  statusSchema,
  stockSchema,
} from '../validate.js';
import { makeSampleOrders } from '../sample.js';
import { reviewFromRow } from './catalog.js';
import { createResetLink } from './auth.js';

const router = Router();
router.use(requireAdmin);

export const LOW_STOCK = 3;

// ---------------------------------------------------------------------------
// Live events (Server-Sent Events). The admin app reads this with fetch() so the
// token travels in the Authorization header rather than the URL.
// ---------------------------------------------------------------------------
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  const send = (e) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  bus.on('event', send);
  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off('event', send);
  });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
router.get('/orders', (_req, res) => res.json({ orders: allOrders() }));

router.get('/orders/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

/** Change status. Cancelling returns stock to the shelf; reopening a cancelled order takes it again. */
router.patch('/orders/:id/status', body(statusSchema), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const next = req.body.status;
  if (order.status !== next) {
    try {
      db.transaction(() => {
        if (!order.demo) {
          if (next === 'Cancelled') restock(order.id);
          else if (order.status === 'Cancelled') unrestock(order.id);
        }
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(next, order.id);
        addOrderEvent(order.id, next, req.body.note || null);
        logActivity(req.user, `Changed order status ${order.status} → ${next}`, 'order', order.id, req.body.note ?? '');
      })();
    } catch (err) {
      if (err instanceof StockError) return res.status(409).json({ error: err.message });
      throw err;
    }
  }
  res.json({ order: getOrder(order.id) });
});

/** Sample data for demos: flagged demo = 1 so it can be removed cleanly. Doesn't touch real stock. */
router.post('/sample', (req, res) => {
  const hasSample = db.prepare('SELECT 1 FROM orders WHERE demo = 1 LIMIT 1').get();
  if (!hasSample) {
    db.transaction(() => makeSampleOrders().forEach((o) => saveOrder(o, { reserveStock: false })))();
    logActivity(req.user, 'Loaded sample orders', 'order', null);
  }
  res.json({ orders: allOrders() });
});

router.delete('/sample', (req, res) => {
  db.prepare('DELETE FROM orders WHERE demo = 1').run();
  logActivity(req.user, 'Removed sample orders', 'order', null);
  res.json({ orders: allOrders() });
});

// ---------------------------------------------------------------------------
// Returns & refunds
// ---------------------------------------------------------------------------
const listReturns = () =>
  db
    .prepare(
      `SELECT r.*, o.name AS customer_name, o.email AS customer_email, o.total AS order_total
         FROM returns r JOIN orders o ON o.id = r.order_id ORDER BY r.created_at DESC`,
    )
    .all()
    .map((r) => ({ ...returnFromRow(r), customer: { name: r.customer_name, email: r.customer_email }, orderTotal: r.order_total }));

router.get('/returns', (_req, res) => res.json({ returns: listReturns() }));

const RETURN_FLOW = { Requested: ['Approved', 'Rejected'], Approved: ['Refunded', 'Rejected'], Rejected: [], Refunded: [] };

router.patch('/returns/:id', body(returnDecisionSchema), (req, res) => {
  const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(Number(req.params.id));
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  const next = req.body.status;
  if (!RETURN_FLOW[ret.status].includes(next))
    return res.status(400).json({ error: `A ${ret.status.toLowerCase()} return can't be marked ${next.toLowerCase()}` });

  db.transaction(() => {
    const order = db.prepare('SELECT total, demo FROM orders WHERE id = ?').get(ret.order_id);
    const refund = next === 'Refunded' ? order.total : ret.refund_amount;
    db.prepare('UPDATE returns SET status = ?, admin_note = ?, refund_amount = ?, updated_at = ? WHERE id = ?').run(
      next,
      req.body.adminNote,
      refund,
      now(),
      ret.id,
    );
    if (next === 'Refunded' && !order.demo) restock(ret.order_id);
    addOrderEvent(ret.order_id, `Return ${next.toLowerCase()}`, req.body.adminNote || null);
    logActivity(req.user, `Marked return ${next.toLowerCase()}`, 'return', ret.order_id, req.body.adminNote);
  })();
  res.json({ returns: listReturns(), order: getOrder(ret.order_id) });
});

// ---------------------------------------------------------------------------
// Products & inventory
// ---------------------------------------------------------------------------
const listProducts = () => db.prepare('SELECT * FROM products ORDER BY sort, created_at').all().map(productFromRow);

router.get('/products', (_req, res) => res.json({ products: listProducts(), lowStock: LOW_STOCK }));

const toRow = (p) => ({
  name: p.name,
  category: p.category,
  type: p.type,
  price: p.price,
  compare_at: p.compareAt ?? null,
  image: p.image,
  badge: p.badge ?? null,
  stock: p.stock,
  colors: JSON.stringify(p.colors),
  materials: JSON.stringify(p.materials),
  story: p.story,
  dimensions: p.dimensions,
  model_url: p.modelUrl || null,
  model_credit: p.modelCredit || null,
  featured: p.featured ? 1 : 0,
  active: p.active ? 1 : 0,
});

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

router.post('/products', body(productSchema), (req, res) => {
  const p = req.body;
  if (p.compareAt && p.compareAt <= p.price)
    return res.status(400).json({ error: 'Compare-at price must be higher than the price', field: 'compareAt' });
  let id = p.id || slugify(p.name);
  if (!id) return res.status(400).json({ error: 'Choose a product ID', field: 'id' });
  if (getProductRow(id)) {
    if (p.id) return res.status(409).json({ error: 'A product with this ID already exists', field: 'id' });
    let n = 2;
    while (getProductRow(`${id}-${n}`)) n++;
    id = `${id}-${n}`;
  }
  const row = { ...toRow(p), id, sort: db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM products').get().s };
  db.prepare(
    `INSERT INTO products (id, name, category, type, price, compare_at, image, badge, stock, colors, materials, story, dimensions,
                           model_url, model_credit, featured, active, sort)
     VALUES (@id, @name, @category, @type, @price, @compare_at, @image, @badge, @stock, @colors, @materials, @story, @dimensions,
             @model_url, @model_credit, @featured, @active, @sort)`,
  ).run(row);
  logActivity(req.user, 'Created product', 'product', id, p.name);
  res.status(201).json({ product: productFromRow(getProductRow(id)) });
});

router.put('/products/:id', body(productSchema), (req, res) => {
  const existing = getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const p = req.body;
  if (p.compareAt && p.compareAt <= p.price)
    return res.status(400).json({ error: 'Compare-at price must be higher than the price', field: 'compareAt' });

  const row = toRow(p);
  db.prepare(
    `UPDATE products SET name=@name, category=@category, type=@type, price=@price, compare_at=@compare_at, image=@image, badge=@badge,
            stock=@stock, colors=@colors, materials=@materials, story=@story, dimensions=@dimensions, model_url=@model_url,
            model_credit=@model_credit, featured=@featured, active=@active, updated_at=@updated_at
      WHERE id=@id`,
  ).run({ ...row, id: existing.id, updated_at: now() });

  const changes = [];
  if (existing.price !== p.price) changes.push(`price ₹${existing.price} → ₹${p.price}`);
  if (existing.stock !== p.stock) changes.push(`stock ${existing.stock} → ${p.stock}`);
  if (!!existing.active !== p.active) changes.push(p.active ? 'shown in shop' : 'hidden from shop');
  logActivity(req.user, 'Updated product', 'product', existing.id, changes.join(', '));
  res.json({ product: productFromRow(getProductRow(existing.id)) });
});

router.patch('/products/:id/stock', body(stockSchema), (req, res) => {
  const existing = getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(req.body.stock, now(), existing.id);
  logActivity(req.user, 'Adjusted stock', 'product', existing.id, `${existing.stock} → ${req.body.stock}`);
  res.json({ product: productFromRow(getProductRow(existing.id)) });
});

/** Products that have been ordered are hidden instead of deleted, so order history stays intact. */
router.delete('/products/:id', (req, res) => {
  const existing = getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const ordered = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(existing.id);
  if (ordered) {
    db.prepare('UPDATE products SET active = 0, updated_at = ? WHERE id = ?').run(now(), existing.id);
    logActivity(req.user, 'Hid product (has orders)', 'product', existing.id, existing.name);
    return res.json({ hidden: true, product: productFromRow(getProductRow(existing.id)) });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(existing.id);
  logActivity(req.user, 'Deleted product', 'product', existing.id, existing.name);
  res.json({ deleted: true });
});

router.post('/uploads/image', imageUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image (JPG, PNG or WebP, up to 4 MB)' });
  res.status(201).json({ url: publicPath(req.file) });
});

router.post('/uploads/model', modelUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a .glb 3D model (up to 25 MB)' });
  res.status(201).json({ url: publicPath(req.file) });
});

// ---------------------------------------------------------------------------
// Reviews moderation
// ---------------------------------------------------------------------------
const listReviews = () =>
  db
    .prepare(
      'SELECT r.*, p.name AS product_name, p.image AS product_image FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC',
    )
    .all()
    .map((r) => ({ ...reviewFromRow(r), product: { name: r.product_name, image: r.product_image } }));

router.get('/reviews', (_req, res) => res.json({ reviews: listReviews() }));

router.patch('/reviews/:id', body(reviewStatusSchema), (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Review not found' });
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(req.body.status, r.id);
  logActivity(req.user, `${req.body.status} review`, 'review', r.id, `${r.rating}★ “${r.title}” on ${r.product_id}`);
  res.json({ reviews: listReviews() });
});

router.delete('/reviews/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Review not found' });
  db.prepare('DELETE FROM reviews WHERE id = ?').run(r.id);
  logActivity(req.user, 'Deleted review', 'review', r.id, `“${r.title}”`);
  res.json({ reviews: listReviews() });
});

// ---------------------------------------------------------------------------
// Discount codes
// ---------------------------------------------------------------------------
const couponFromRow = (c) => ({
  code: c.code,
  kind: c.kind,
  value: c.value,
  minSubtotal: c.min_subtotal,
  maxUses: c.max_uses,
  used: c.used,
  expiresAt: c.expires_at,
  active: !!c.active,
  date: c.created_at,
  revenue: c.revenue ?? 0,
  discountGiven: c.discount_given ?? 0,
});
const listCoupons = () =>
  db
    .prepare(
      `SELECT c.*, COALESCE(SUM(o.total), 0) AS revenue, COALESCE(SUM(o.discount), 0) AS discount_given
         FROM coupons c LEFT JOIN orders o ON o.coupon_code = c.code AND o.status != 'Cancelled'
        GROUP BY c.code ORDER BY c.created_at DESC`,
    )
    .all()
    .map(couponFromRow);

router.get('/coupons', (_req, res) => res.json({ coupons: listCoupons() }));

const validCoupon = (c) => (c.kind === 'percent' && c.value > 90 ? 'Percentage discounts can be at most 90%' : null);

router.post('/coupons', body(couponSchema), (req, res) => {
  const c = req.body;
  const problem = validCoupon(c);
  if (problem) return res.status(400).json({ error: problem, field: 'value' });
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ?').get(c.code))
    return res.status(409).json({ error: 'That code already exists', field: 'code' });
  db.prepare('INSERT INTO coupons (code, kind, value, min_subtotal, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    c.code,
    c.kind,
    c.value,
    c.minSubtotal,
    c.maxUses ?? null,
    c.expiresAt ?? null,
    c.active ? 1 : 0,
  );
  logActivity(req.user, 'Created discount code', 'coupon', c.code, c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`);
  res.status(201).json({ coupons: listCoupons() });
});

router.put('/coupons/:code', body(couponSchema), (req, res) => {
  const c = req.body;
  const problem = validCoupon(c);
  if (problem) return res.status(400).json({ error: problem, field: 'value' });
  const { changes } = db
    .prepare('UPDATE coupons SET kind=?, value=?, min_subtotal=?, max_uses=?, expires_at=?, active=? WHERE code=?')
    .run(c.kind, c.value, c.minSubtotal, c.maxUses ?? null, c.expiresAt ?? null, c.active ? 1 : 0, req.params.code);
  if (!changes) return res.status(404).json({ error: 'Code not found' });
  logActivity(req.user, c.active ? 'Updated discount code' : 'Disabled discount code', 'coupon', req.params.code);
  res.json({ coupons: listCoupons() });
});

router.delete('/coupons/:code', (req, res) => {
  const { changes } = db.prepare('DELETE FROM coupons WHERE code = ?').run(req.params.code);
  if (!changes) return res.status(404).json({ error: 'Code not found' });
  logActivity(req.user, 'Deleted discount code', 'coupon', req.params.code);
  res.json({ coupons: listCoupons() });
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/** Everything about one customer, keyed by email: account, orders, addresses, returns, reviews. */
router.get('/customers/:email', (req, res) => {
  const email = req.params.email.toLowerCase();
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE email = ?').get(email);
  const orders = hydrateOrders(db.prepare('SELECT * FROM orders WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC').all(email));
  if (!user && orders.length === 0) return res.status(404).json({ error: 'Customer not found' });

  const addresses = user ? db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC').all(user.id) : [];
  const reviews = user
    ? db
        .prepare(
          'SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.user_id = ? ORDER BY r.created_at DESC',
        )
        .all(user.id)
        .map((r) => ({ ...reviewFromRow(r), product: { name: r.product_name } }))
    : [];
  const wishlist = user
    ? db
        .prepare('SELECT product_id FROM wishlist WHERE user_id = ?')
        .all(user.id)
        .map((r) => r.product_id)
    : [];

  res.json({
    customer: {
      email,
      name: user?.name ?? orders[0].customer.name,
      phone: orders[0]?.customer.phone ?? null,
      account: user ? { id: user.id, role: user.role, joined: user.created_at } : null,
    },
    orders,
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      state: a.state,
      zip: a.zip,
      country: a.country,
      isDefault: !!a.is_default,
    })),
    reviews,
    wishlist,
  });
});

/** No email service, so admins can create a reset link and send it to the customer themselves. */
router.post('/customers/:email/reset-link', (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(req.params.email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'This customer has no account' });
  const link = createResetLink(user.id);
  logActivity(req.user, 'Created password reset link', 'customer', user.email);
  res.status(201).json(link);
});

// ---------------------------------------------------------------------------
// Messages, subscribers, accounts, activity
// ---------------------------------------------------------------------------
router.get('/messages', (_req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      topic: m.topic,
      message: m.message,
      read: !!m.read,
      date: m.created_at,
    })),
  });
});

router.patch('/messages/:id', body(readSchema), (req, res) => {
  const { changes } = db.prepare('UPDATE messages SET read = ? WHERE id = ?').run(req.body.read ? 1 : 0, Number(req.params.id));
  if (!changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ ok: true });
});

router.delete('/messages/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM messages WHERE id = ?').run(Number(req.params.id));
  if (!changes) return res.status(404).json({ error: 'Message not found' });
  logActivity(req.user, 'Deleted message', 'message', req.params.id);
  res.json({ ok: true });
});

router.get('/subscribers', (_req, res) => {
  const rows = db.prepare('SELECT email, created_at FROM subscribers ORDER BY created_at DESC').all();
  res.json({ subscribers: rows.map((s) => ({ email: s.email, date: s.created_at })) });
});

router.get('/users', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              COUNT(o.id) AS orders, COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total END), 0) AS spent
         FROM users u LEFT JOIN orders o ON o.user_id = u.id
        GROUP BY u.id ORDER BY u.created_at DESC`,
    )
    .all();
  res.json({ users: rows.map((u) => ({ ...u, date: u.created_at })) });
});

router.get('/activity', (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity ORDER BY created_at DESC, id DESC LIMIT 500').all();
  res.json({
    activity: rows.map((a) => ({
      id: a.id,
      admin: a.admin_name,
      action: a.action,
      entity: a.entity,
      entityId: a.entity_id,
      details: a.details,
      date: a.created_at,
    })),
  });
});

export default router;
