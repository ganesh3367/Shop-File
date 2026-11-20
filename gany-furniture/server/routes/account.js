import { batch, db, getOrder, returnFromRow, withTx } from '../db.js';
import { asyncRouter } from '../http.js';
import { requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { addressSchema, body, returnSchema } from '../validate.js';

const router = asyncRouter();
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
const listAddresses = async (userId) =>
  (await db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at', userId)).map(addressFromRow);

router.get('/addresses', async (req, res) => res.json({ addresses: await listAddresses(req.user.id) }));

/** Insert or update an address; keeps exactly one default. Returns the number of rows written. */
const writeAddress = (userId, a, id) =>
  withTx(async (tx) => {
    const isFirst = !(await tx.get('SELECT 1 AS x FROM addresses WHERE user_id = ?', userId));
    const makeDefault = a.isDefault || isFirst;
    if (makeDefault) await tx.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', userId);
    const values = [a.label, a.name, a.phone, a.address, a.city, a.state, a.zip, a.country, makeDefault ? 1 : 0];
    if (id) {
      const { changes } = await tx.run(
        'UPDATE addresses SET label=?, name=?, phone=?, address=?, city=?, state=?, zip=?, country=?, is_default=? WHERE id=? AND user_id=?',
        ...values,
        id,
        userId,
      );
      if (!changes) throw Object.assign(new Error('Address not found'), { status: 404 });
      return changes;
    }
    await tx.run(
      'INSERT INTO addresses (label, name, phone, address, city, state, zip, country, is_default, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ...values,
      userId,
    );
    return 1;
  });

router.post('/addresses', body(addressSchema), async (req, res) => {
  if ((await db.get('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', req.user.id)).n >= 10) {
    return res.status(400).json({ error: 'You can save up to 10 addresses' });
  }
  await writeAddress(req.user.id, req.body);
  res.status(201).json({ addresses: await listAddresses(req.user.id) });
});

router.put('/addresses/:id', body(addressSchema), async (req, res) => {
  await writeAddress(req.user.id, req.body, Number(req.params.id));
  res.json({ addresses: await listAddresses(req.user.id) });
});

router.delete('/addresses/:id', async (req, res) => {
  const row = await db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Address not found' });
  await batch([
    ['DELETE FROM addresses WHERE id = ?', row.id],
    // Keep exactly one default if any addresses remain.
    ...(row.is_default
      ? [
          [
            'UPDATE addresses SET is_default = 1 WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at LIMIT 1)',
            req.user.id,
          ],
        ]
      : []),
  ]);
  res.json({ addresses: await listAddresses(req.user.id) });
});

// ---------------------------------------------------------------------------
// Wishlist (synced to the account so it follows the customer across devices)
// ---------------------------------------------------------------------------
const wishlistIds = async (userId) =>
  (await db.all('SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at', userId)).map((r) => r.product_id);
const ADD_WISH = 'INSERT OR IGNORE INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ?';

router.get('/wishlist', async (req, res) => res.json({ ids: await wishlistIds(req.user.id) }));

/** Merge the browser's wishlist into the account (used right after logging in). */
router.post('/wishlist/sync', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => typeof x === 'string').slice(0, 200) : [];
  if (ids.length) await batch(ids.map((id) => [ADD_WISH, req.user.id, id]));
  res.json({ ids: await wishlistIds(req.user.id) });
});

router.put('/wishlist/:productId', async (req, res) => {
  await db.run(ADD_WISH, req.user.id, req.params.productId);
  res.json({ ids: await wishlistIds(req.user.id) });
});

router.delete('/wishlist/:productId', async (req, res) => {
  await db.run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', req.user.id, req.params.productId);
  res.json({ ids: await wishlistIds(req.user.id) });
});

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

/** Request a return for a delivered order, within the return window. One open request per order. */
router.post('/orders/:id/return', body(returnSchema), async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'Delivered') return res.status(400).json({ error: 'Returns can be requested once an order is delivered' });

  const delivered = [...order.history].reverse().find((h) => h.status === 'Delivered')?.date ?? order.date;
  const ageDays = (Date.now() - new Date(delivered).getTime()) / 864e5;
  if (ageDays > RETURN_WINDOW_DAYS) {
    return res.status(400).json({ error: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed` });
  }
  if (order.return && order.return.status !== 'Rejected') {
    return res.status(409).json({ error: 'A return has already been requested for this order' });
  }

  const { lastInsertRowid } = await db.run(
    'INSERT INTO returns (order_id, user_id, reason, details) VALUES (?, ?, ?, ?)',
    order.id,
    req.user.id,
    req.body.reason,
    req.body.details,
  );
  const ret = returnFromRow(await db.get('SELECT * FROM returns WHERE id = ?', lastInsertRowid));
  notifyAdmins('return', { id: ret.id, orderId: order.id, reason: ret.reason });
  res.status(201).json({ return: ret });
});

export default router;
