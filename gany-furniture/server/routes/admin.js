import {
  StockError,
  addOrderEvent,
  allOrders,
  batch,
  db,
  deleteOrders,
  getOrder,
  getProduct,
  getProductRow,
  hydrateOrders,
  logActivity,
  now,
  productsFromRows,
  restock,
  returnFromRow,
  saveSampleOrders,
  unrestock,
  withTx,
} from '../db.js';
import { asyncRouter } from '../http.js';
import { requireAdmin } from '../auth.js';
import { bus } from '../events.js';
import { imageUpload, modelUpload, saveUpload } from '../uploads.js';
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

const router = asyncRouter();
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
router.get('/orders', async (_req, res) => res.json({ orders: await allOrders() }));

router.get('/orders/:id', async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

/** Change status. Cancelling returns stock to the shelf; reopening a cancelled order takes it again. */
router.patch('/orders/:id/status', body(statusSchema), async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const next = req.body.status;
  if (order.status !== next) {
    try {
      await withTx(async (tx) => {
        if (!order.demo) {
          if (next === 'Cancelled') await restock(tx, order.id);
          else if (order.status === 'Cancelled') await unrestock(tx, order.id);
        }
        await tx.run('UPDATE orders SET status = ? WHERE id = ?', next, order.id);
        await addOrderEvent(tx, order.id, next, req.body.note || null);
        await logActivity(req.user, `Changed order status ${order.status} → ${next}`, 'order', order.id, req.body.note ?? '', tx);
      });
    } catch (err) {
      if (err instanceof StockError) return res.status(409).json({ error: err.message });
      throw err;
    }
  }
  res.json({ order: await getOrder(order.id) });
});

/** Sample data for demos: flagged demo = 1 so it can be removed cleanly. Doesn't touch real stock. */
router.post('/sample', async (req, res) => {
  if (!(await db.get('SELECT 1 AS x FROM orders WHERE demo = 1 LIMIT 1'))) {
    await saveSampleOrders(await makeSampleOrders());
    await logActivity(req.user, 'Loaded sample orders', 'order', null);
  }
  res.json({ orders: await allOrders() });
});

router.delete('/sample', async (req, res) => {
  await deleteOrders('demo = 1');
  await logActivity(req.user, 'Removed sample orders', 'order', null);
  res.json({ orders: await allOrders() });
});

// ---------------------------------------------------------------------------
// Returns & refunds
// ---------------------------------------------------------------------------
const listReturns = async () =>
  (
    await db.all(
      `SELECT r.*, o.name AS customer_name, o.email AS customer_email, o.total AS order_total
         FROM returns r JOIN orders o ON o.id = r.order_id ORDER BY r.created_at DESC`,
    )
  ).map((r) => ({ ...returnFromRow(r), customer: { name: r.customer_name, email: r.customer_email }, orderTotal: r.order_total }));

router.get('/returns', async (_req, res) => res.json({ returns: await listReturns() }));

const RETURN_FLOW = { Requested: ['Approved', 'Rejected'], Approved: ['Refunded', 'Rejected'], Rejected: [], Refunded: [] };

router.patch('/returns/:id', body(returnDecisionSchema), async (req, res) => {
  const ret = await db.get('SELECT * FROM returns WHERE id = ?', Number(req.params.id));
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  const next = req.body.status;
  if (!RETURN_FLOW[ret.status].includes(next)) {
    return res.status(400).json({ error: `A ${ret.status.toLowerCase()} return can't be marked ${next.toLowerCase()}` });
  }

  await withTx(async (tx) => {
    const order = await tx.get('SELECT total, demo FROM orders WHERE id = ?', ret.order_id);
    const refund = next === 'Refunded' ? order.total : ret.refund_amount;
    await tx.run(
      'UPDATE returns SET status = ?, admin_note = ?, refund_amount = ?, updated_at = ? WHERE id = ?',
      next,
      req.body.adminNote,
      refund,
      now(),
      ret.id,
    );
    if (next === 'Refunded' && !order.demo) await restock(tx, ret.order_id);
    await addOrderEvent(tx, ret.order_id, `Return ${next.toLowerCase()}`, req.body.adminNote || null);
    await logActivity(req.user, `Marked return ${next.toLowerCase()}`, 'return', ret.order_id, req.body.adminNote, tx);
  });
  res.json({ returns: await listReturns(), order: await getOrder(ret.order_id) });
});

// ---------------------------------------------------------------------------
// Products & inventory
// ---------------------------------------------------------------------------
const listProducts = async () => productsFromRows(await db.all('SELECT * FROM products ORDER BY sort, created_at'));

router.get('/products', async (_req, res) => res.json({ products: await listProducts(), lowStock: LOW_STOCK }));

const PRODUCT_COLS = [
  'name',
  'category',
  'type',
  'price',
  'compare_at',
  'image',
  'badge',
  'stock',
  'colors',
  'materials',
  'story',
  'dimensions',
  'model_url',
  'model_credit',
  'featured',
  'active',
];
const toValues = (p) => [
  p.name,
  p.category,
  p.type,
  p.price,
  p.compareAt ?? null,
  p.image,
  p.badge ?? null,
  p.stock,
  JSON.stringify(p.colors),
  JSON.stringify(p.materials),
  p.story,
  p.dimensions,
  p.modelUrl || null,
  p.modelCredit || null,
  p.featured ? 1 : 0,
  p.active ? 1 : 0,
];

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

router.post('/products', body(productSchema), async (req, res) => {
  const p = req.body;
  if (p.compareAt && p.compareAt <= p.price) {
    return res.status(400).json({ error: 'Compare-at price must be higher than the price', field: 'compareAt' });
  }
  let id = p.id || slugify(p.name);
  if (!id) return res.status(400).json({ error: 'Choose a product ID', field: 'id' });
  if (await getProductRow(id)) {
    if (p.id) return res.status(409).json({ error: 'A product with this ID already exists', field: 'id' });
    let n = 2;
    while (await getProductRow(`${id}-${n}`)) n++;
    id = `${id}-${n}`;
  }
  const { s: sort } = await db.get('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM products');
  await db.run(
    `INSERT INTO products (id, ${PRODUCT_COLS.join(', ')}, sort) VALUES (?, ${PRODUCT_COLS.map(() => '?').join(', ')}, ?)`,
    id,
    ...toValues(p),
    sort,
  );
  await logActivity(req.user, 'Created product', 'product', id, p.name);
  res.status(201).json({ product: await getProduct(id) });
});

router.put('/products/:id', body(productSchema), async (req, res) => {
  const existing = await getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const p = req.body;
  if (p.compareAt && p.compareAt <= p.price) {
    return res.status(400).json({ error: 'Compare-at price must be higher than the price', field: 'compareAt' });
  }
  await db.run(
    `UPDATE products SET ${PRODUCT_COLS.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    ...toValues(p),
    now(),
    existing.id,
  );

  const changes = [];
  if (existing.price !== p.price) changes.push(`price ₹${existing.price} → ₹${p.price}`);
  if (existing.stock !== p.stock) changes.push(`stock ${existing.stock} → ${p.stock}`);
  if (!!existing.active !== p.active) changes.push(p.active ? 'shown in shop' : 'hidden from shop');
  await logActivity(req.user, 'Updated product', 'product', existing.id, changes.join(', '));
  res.json({ product: await getProduct(existing.id) });
});

router.patch('/products/:id/stock', body(stockSchema), async (req, res) => {
  const existing = await getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  await db.run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', req.body.stock, now(), existing.id);
  await logActivity(req.user, 'Adjusted stock', 'product', existing.id, `${existing.stock} → ${req.body.stock}`);
  res.json({ product: await getProduct(existing.id) });
});

/** Products that have been ordered are hidden instead of deleted, so order history stays intact. */
router.delete('/products/:id', async (req, res) => {
  const existing = await getProductRow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  if (await db.get('SELECT 1 AS x FROM order_items WHERE product_id = ? LIMIT 1', existing.id)) {
    await db.run('UPDATE products SET active = 0, updated_at = ? WHERE id = ?', now(), existing.id);
    await logActivity(req.user, 'Hid product (has orders)', 'product', existing.id, existing.name);
    return res.json({ hidden: true, product: await getProduct(existing.id) });
  }
  await batch([
    ['DELETE FROM reviews WHERE product_id = ?', existing.id],
    ['DELETE FROM wishlist WHERE product_id = ?', existing.id],
    ['DELETE FROM products WHERE id = ?', existing.id],
  ]);
  await logActivity(req.user, 'Deleted product', 'product', existing.id, existing.name);
  res.json({ deleted: true });
});

router.post('/uploads/image', imageUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image (JPG, PNG or WebP, up to 4 MB)' });
  res.status(201).json({ url: await saveUpload(req.file) });
});

router.post('/uploads/model', modelUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a .glb 3D model (up to 10 MB)' });
  res.status(201).json({ url: await saveUpload(req.file) });
});

// ---------------------------------------------------------------------------
// Reviews moderation
// ---------------------------------------------------------------------------
const listReviews = async () =>
  (
    await db.all(
      'SELECT r.*, p.name AS product_name, p.image AS product_image FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC',
    )
  ).map((r) => ({ ...reviewFromRow(r), product: { name: r.product_name, image: r.product_image } }));

router.get('/reviews', async (_req, res) => res.json({ reviews: await listReviews() }));

router.patch('/reviews/:id', body(reviewStatusSchema), async (req, res) => {
  const r = await db.get('SELECT * FROM reviews WHERE id = ?', Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Review not found' });
  await db.run('UPDATE reviews SET status = ? WHERE id = ?', req.body.status, r.id);
  await logActivity(req.user, `${req.body.status} review`, 'review', r.id, `${r.rating}★ “${r.title}” on ${r.product_id}`);
  res.json({ reviews: await listReviews() });
});

router.delete('/reviews/:id', async (req, res) => {
  const r = await db.get('SELECT * FROM reviews WHERE id = ?', Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Review not found' });
  await db.run('DELETE FROM reviews WHERE id = ?', r.id);
  await logActivity(req.user, 'Deleted review', 'review', r.id, `“${r.title}”`);
  res.json({ reviews: await listReviews() });
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
const listCoupons = async () =>
  (
    await db.all(
      `SELECT c.*, COALESCE(SUM(o.total), 0) AS revenue, COALESCE(SUM(o.discount), 0) AS discount_given
         FROM coupons c LEFT JOIN orders o ON o.coupon_code = c.code AND o.status != 'Cancelled'
        GROUP BY c.code ORDER BY c.created_at DESC`,
    )
  ).map(couponFromRow);

router.get('/coupons', async (_req, res) => res.json({ coupons: await listCoupons() }));

const validCoupon = (c) => (c.kind === 'percent' && c.value > 90 ? 'Percentage discounts can be at most 90%' : null);

router.post('/coupons', body(couponSchema), async (req, res) => {
  const c = req.body;
  const problem = validCoupon(c);
  if (problem) return res.status(400).json({ error: problem, field: 'value' });
  if (await db.get('SELECT 1 AS x FROM coupons WHERE code = ?', c.code)) {
    return res.status(409).json({ error: 'That code already exists', field: 'code' });
  }
  await db.run(
    'INSERT INTO coupons (code, kind, value, min_subtotal, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    c.code,
    c.kind,
    c.value,
    c.minSubtotal,
    c.maxUses ?? null,
    c.expiresAt ?? null,
    c.active ? 1 : 0,
  );
  await logActivity(req.user, 'Created discount code', 'coupon', c.code, c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`);
  res.status(201).json({ coupons: await listCoupons() });
});

router.put('/coupons/:code', body(couponSchema), async (req, res) => {
  const c = req.body;
  const problem = validCoupon(c);
  if (problem) return res.status(400).json({ error: problem, field: 'value' });
  const { changes } = await db.run(
    'UPDATE coupons SET kind=?, value=?, min_subtotal=?, max_uses=?, expires_at=?, active=? WHERE code=?',
    c.kind,
    c.value,
    c.minSubtotal,
    c.maxUses ?? null,
    c.expiresAt ?? null,
    c.active ? 1 : 0,
    req.params.code,
  );
  if (!changes) return res.status(404).json({ error: 'Code not found' });
  await logActivity(req.user, c.active ? 'Updated discount code' : 'Disabled discount code', 'coupon', req.params.code);
  res.json({ coupons: await listCoupons() });
});

router.delete('/coupons/:code', async (req, res) => {
  const { changes } = await db.run('DELETE FROM coupons WHERE code = ?', req.params.code);
  if (!changes) return res.status(404).json({ error: 'Code not found' });
  await logActivity(req.user, 'Deleted discount code', 'coupon', req.params.code);
  res.json({ coupons: await listCoupons() });
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/** Everything about one customer, keyed by email: account, orders, addresses, returns, reviews. */
router.get('/customers/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();
  const [user, orderRows] = await Promise.all([
    db.get('SELECT id, name, email, role, created_at FROM users WHERE email = ?', email),
    db.all('SELECT * FROM orders WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC', email),
  ]);
  const orders = await hydrateOrders(orderRows);
  if (!user && orders.length === 0) return res.status(404).json({ error: 'Customer not found' });

  const [addresses, reviewRows, wishRows] = user
    ? await Promise.all([
        db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', user.id),
        db.all(
          'SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.user_id = ? ORDER BY r.created_at DESC',
          user.id,
        ),
        db.all('SELECT product_id FROM wishlist WHERE user_id = ?', user.id),
      ])
    : [[], [], []];

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
    reviews: reviewRows.map((r) => ({ ...reviewFromRow(r), product: { name: r.product_name } })),
    wishlist: wishRows.map((r) => r.product_id),
  });
});

/** No email service, so admins can create a reset link and send it to the customer themselves. */
router.post('/customers/:email/reset-link', async (req, res) => {
  const user = await db.get('SELECT id, email FROM users WHERE email = ?', req.params.email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'This customer has no account' });
  const link = await createResetLink(user.id);
  await logActivity(req.user, 'Created password reset link', 'customer', user.email);
  res.status(201).json(link);
});

// ---------------------------------------------------------------------------
// Messages, subscribers, accounts, activity
// ---------------------------------------------------------------------------
router.get('/messages', async (_req, res) => {
  const rows = await db.all('SELECT * FROM messages ORDER BY created_at DESC');
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

router.patch('/messages/:id', body(readSchema), async (req, res) => {
  const { changes } = await db.run('UPDATE messages SET read = ? WHERE id = ?', req.body.read ? 1 : 0, Number(req.params.id));
  if (!changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ ok: true });
});

router.delete('/messages/:id', async (req, res) => {
  const { changes } = await db.run('DELETE FROM messages WHERE id = ?', Number(req.params.id));
  if (!changes) return res.status(404).json({ error: 'Message not found' });
  await logActivity(req.user, 'Deleted message', 'message', req.params.id);
  res.json({ ok: true });
});

router.get('/subscribers', async (_req, res) => {
  const rows = await db.all('SELECT email, created_at FROM subscribers ORDER BY created_at DESC');
  res.json({ subscribers: rows.map((s) => ({ email: s.email, date: s.created_at })) });
});

router.get('/users', async (_req, res) => {
  const rows = await db.all(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            COUNT(o.id) AS orders, COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total END), 0) AS spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC`,
  );
  res.json({ users: rows.map((u) => ({ ...u, date: u.created_at })) });
});

router.get('/activity', async (_req, res) => {
  const rows = await db.all('SELECT * FROM activity ORDER BY created_at DESC, id DESC LIMIT 500');
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
