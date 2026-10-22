import { Router } from 'express';
import { db, hydrateOrders, saveOrder } from '../db.js';
import { requireAdmin } from '../auth.js';
import { body, readSchema, statusSchema } from '../validate.js';
import { makeSampleOrders } from '../sample.js';

const router = Router();
router.use(requireAdmin);

router.get('/orders', (_req, res) => {
  res.json({ orders: hydrateOrders(db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()) });
});

router.patch('/orders/:id/status', body(statusSchema), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== req.body.status) {
    db.transaction(() => {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, order.id);
      db.prepare('INSERT INTO order_events (order_id, status, created_at) VALUES (?, ?, ?)').run(
        order.id,
        req.body.status,
        new Date().toISOString(),
      );
    })();
  }
  const [updated] = hydrateOrders(db.prepare('SELECT * FROM orders WHERE id = ?').all(order.id));
  res.json({ order: updated });
});

/** Sample data for demos: flagged with demo = 1 so it can be removed cleanly. */
router.post('/sample', (_req, res) => {
  const hasSample = db.prepare('SELECT 1 FROM orders WHERE demo = 1 LIMIT 1').get();
  if (!hasSample) db.transaction(() => makeSampleOrders().forEach((o) => saveOrder(o)))();
  res.json({ orders: hydrateOrders(db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()) });
});

router.delete('/sample', (_req, res) => {
  db.prepare('DELETE FROM orders WHERE demo = 1').run();
  res.json({ orders: hydrateOrders(db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()) });
});

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

export default router;
