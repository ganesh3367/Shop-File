import { Router } from 'express';
import { db, getProductRow, productFromRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { imageUpload, publicPath } from '../uploads.js';
import { body, reviewSchema } from '../validate.js';

const router = Router();

/** The live catalogue (hidden products excluded). */
router.get('/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort, created_at').all();
  res.json({ products: rows.map(productFromRow) });
});

const reviewFromRow = (r) => ({
  id: r.id,
  productId: r.product_id,
  name: r.name,
  rating: r.rating,
  title: r.title,
  body: r.body,
  photo: r.photo,
  verified: !!r.verified,
  status: r.status,
  date: r.created_at,
});
export { reviewFromRow };

/**
 * Product detail extras: approved reviews and "frequently bought together"
 * (products that most often appear in the same orders, topped up from the same category).
 */
router.get('/products/:id', (req, res) => {
  const row = getProductRow(req.params.id);
  if (!row || !row.active) return res.status(404).json({ error: 'Product not found' });

  const reviews = db
    .prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'Approved' ORDER BY created_at DESC")
    .all(row.id)
    .map(reviewFromRow);

  const together = db
    .prepare(
      `SELECT b.product_id AS id, COUNT(DISTINCT b.order_id) AS n
         FROM order_items a
         JOIN order_items b ON b.order_id = a.order_id AND b.product_id != a.product_id
         JOIN products p ON p.id = b.product_id AND p.active = 1 AND p.stock > 0
        WHERE a.product_id = ?
        GROUP BY b.product_id ORDER BY n DESC LIMIT 3`,
    )
    .all(row.id)
    .map((r) => r.id);

  if (together.length < 2) {
    // Not enough order history yet: suggest complementary pieces from the other categories.
    const fill = db
      .prepare('SELECT id FROM products WHERE active = 1 AND stock > 0 AND category != ? AND featured = 1 ORDER BY sort LIMIT 4')
      .all(row.category)
      .map((r) => r.id)
      .filter((id) => !together.includes(id));
    together.push(...fill.slice(0, 2 - together.length));
  }

  res.json({ product: productFromRow(row), reviews, together });
});

/** Customers review products; reviews appear once an admin approves them. One review per customer per product. */
router.post('/products/:id/reviews', requireAuth, imageUpload.single('photo'), body(reviewSchema), (req, res) => {
  const row = getProductRow(req.params.id);
  if (!row || !row.active) return res.status(404).json({ error: 'Product not found' });
  if (db.prepare('SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ?').get(row.id, req.user.id)) {
    return res.status(409).json({ error: "You've already reviewed this product" });
  }
  const bought = db
    .prepare(
      `SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE i.product_id = ? AND o.user_id = ? AND o.status != 'Cancelled' LIMIT 1`,
    )
    .get(row.id, req.user.id);

  const { lastInsertRowid } = db
    .prepare('INSERT INTO reviews (product_id, user_id, name, rating, title, body, photo, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(row.id, req.user.id, req.user.name, req.body.rating, req.body.title, req.body.body, publicPath(req.file), bought ? 1 : 0);

  const review = reviewFromRow(db.prepare('SELECT * FROM reviews WHERE id = ?').get(lastInsertRowid));
  notifyAdmins('review', { id: review.id, product: row.name, rating: review.rating });
  res.status(201).json({ review });
});

export default router;
