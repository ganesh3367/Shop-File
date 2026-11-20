import { Router } from 'express';
import { db, getOrder, returnFromRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { addressSchema, body, returnSchema } from '../validate.js';

const router = Router();
router.use(requireAuth);

const RETURN_WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// Saved addresses
// ---------------------------------------------------------------------------
const addressFromRow = (a) => ({
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
});
const listAddresses = (userId) =>
  db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at').all(userId).map(addressFromRow);

router.get('/addresses', (req, res) => res.json({ addresses: listAddresses(req.user.id) }));

const writeAddress = (userId, a, id) =>
  db.transaction(() => {
    const isFirst = !db.prepare('SELECT 1 FROM addresses WHERE user_id = ?').get(userId);
    const makeDefault = a.isDefault || isFirst;
    if (makeDefault) db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
    const values = [a.label, a.name, a.phone, a.address, a.city, a.state, a.zip, a.country, makeDefault ? 1 : 0];
    if (id) {
      return db
        .prepare(
          'UPDATE addresses SET label=?, name=?, phone=?, address=?, city=?, state=?, zip=?, country=?, is_default=? WHERE id=? AND user_id=?',
        )
        .run(...values, id, userId).changes;
    }
    db.prepare(
      'INSERT INTO addresses (label, name, phone, address, city, state, zip, country, is_default, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(...values, userId);
    return 1;
  })();

router.post('/addresses', body(addressSchema), (req, res) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?').get(req.user.id).n >= 10) {
    return res.status(400).json({ error: 'You can save up to 10 addresses' });
  }
  writeAddress(req.user.id, req.body);
  res.status(201).json({ addresses: listAddresses(req.user.id) });
});

router.put('/addresses/:id', body(addressSchema), (req, res) => {
  if (!writeAddress(req.user.id, req.body, Number(req.params.id))) return res.status(404).json({ error: 'Address not found' });
  res.json({ addresses: listAddresses(req.user.id) });
});

router.delete('/addresses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Address not found' });
  db.transaction(() => {
    db.prepare('DELETE FROM addresses WHERE id = ?').run(row.id);
    // Keep exactly one default if any addresses remain.
    if (row.is_default)
      db.prepare(
        'UPDATE addresses SET is_default = 1 WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at LIMIT 1)',
      ).run(req.user.id);
  })();
  res.json({ addresses: listAddresses(req.user.id) });
});

// ---------------------------------------------------------------------------
// Wishlist (synced to the account so it follows the customer across devices)
// ---------------------------------------------------------------------------
const wishlistIds = (userId) =>
  db
    .prepare('SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at')
    .all(userId)
    .map((r) => r.product_id);

router.get('/wishlist', (req, res) => res.json({ ids: wishlistIds(req.user.id) }));

/** Merge the browser's wishlist into the account (used right after logging in). */
router.post('/wishlist/sync', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => typeof x === 'string').slice(0, 200) : [];
  const insert = db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ?');
  db.transaction(() => ids.forEach((id) => insert.run(req.user.id, id)))();
  res.json({ ids: wishlistIds(req.user.id) });
});

router.put('/wishlist/:productId', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ?').run(
    req.user.id,
    req.params.productId,
  );
  res.json({ ids: wishlistIds(req.user.id) });
});

router.delete('/wishlist/:productId', (req, res) => {
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ ids: wishlistIds(req.user.id) });
});

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

/** Request a return for a delivered order, within the return window. One open request per order. */
router.post('/orders/:id/return', body(returnSchema), (req, res) => {
  const order = getOrder(req.params.id);
  if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'Delivered') return res.status(400).json({ error: 'Returns can be requested once an order is delivered' });

  const delivered = [...order.history].reverse().find((h) => h.status === 'Delivered')?.date ?? order.date;
  const ageDays = (Date.now() - new Date(delivered).getTime()) / 864e5;
  if (ageDays > RETURN_WINDOW_DAYS)
    return res.status(400).json({ error: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed` });
  if (order.return && order.return.status !== 'Rejected')
    return res.status(409).json({ error: 'A return has already been requested for this order' });

  const { lastInsertRowid } = db
    .prepare('INSERT INTO returns (order_id, user_id, reason, details) VALUES (?, ?, ?, ?)')
    .run(order.id, req.user.id, req.body.reason, req.body.details);
  const ret = returnFromRow(db.prepare('SELECT * FROM returns WHERE id = ?').get(lastInsertRowid));
  notifyAdmins('return', { id: ret.id, orderId: order.id, reason: ret.reason });
  res.status(201).json({ return: ret });
});

export default router;
