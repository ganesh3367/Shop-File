import { db, getProduct, getProductRow, productsFromRows } from '../db.js';
import { asyncRouter } from '../http.js';
import { requireAuth } from '../auth.js';
import { notifyAdmins } from '../events.js';
import { imageUpload, saveUpload } from '../uploads.js';
import { body, reviewSchema } from '../validate.js';

const router = asyncRouter();

/** The live catalogue (hidden products excluded). */
router.get('/products', async (_req, res) => {
  const rows = await db.all('SELECT * FROM products WHERE active = 1 ORDER BY sort, created_at');
  res.json({ products: await productsFromRows(rows) });
});

export const reviewFromRow = (r) => ({
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

/**
 * Product detail extras: approved reviews and "frequently bought together"
 * (products that most often appear in the same orders, topped up from other categories).
 */
router.get('/products/:id', async (req, res) => {
  const row = await getProductRow(req.params.id);
  if (!row || !row.active) return res.status(404).json({ error: 'Product not found' });

  const [product, reviewRows, togetherRows] = await Promise.all([
    getProduct(row.id),
    db.all("SELECT * FROM reviews WHERE product_id = ? AND status = 'Approved' ORDER BY created_at DESC", row.id),
    db.all(
      `SELECT b.product_id AS id, COUNT(DISTINCT b.order_id) AS n
         FROM order_items a
         JOIN order_items b ON b.order_id = a.order_id AND b.product_id != a.product_id
         JOIN products p ON p.id = b.product_id AND p.active = 1 AND p.stock > 0
        WHERE a.product_id = ?
        GROUP BY b.product_id ORDER BY n DESC LIMIT 3`,
      row.id,
    ),
  ]);

  const together = togetherRows.map((r) => r.id);
  if (together.length < 2) {
    // Not enough order history yet: suggest complementary pieces from the other categories.
    const fill = await db.all(
      'SELECT id FROM products WHERE active = 1 AND stock > 0 AND category != ? AND featured = 1 ORDER BY sort LIMIT 4',
      row.category,
    );
    together.push(
      ...fill
        .map((r) => r.id)
        .filter((id) => !together.includes(id))
        .slice(0, 2 - together.length),
    );
  }

  res.json({ product, reviews: reviewRows.map(reviewFromRow), together });
});

/** Customers review products; reviews appear once an admin approves them. One review per customer per product. */
router.post('/products/:id/reviews', requireAuth, imageUpload.single('photo'), body(reviewSchema), async (req, res) => {
  const row = await getProductRow(req.params.id);
  if (!row || !row.active) return res.status(404).json({ error: 'Product not found' });
  if (await db.get('SELECT 1 AS x FROM reviews WHERE product_id = ? AND user_id = ?', row.id, req.user.id)) {
    return res.status(409).json({ error: "You've already reviewed this product" });
  }
  const bought = await db.get(
    `SELECT 1 AS x FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE i.product_id = ? AND o.user_id = ? AND o.status != 'Cancelled' LIMIT 1`,
    row.id,
    req.user.id,
  );

  const photo = await saveUpload(req.file);
  const { lastInsertRowid } = await db.run(
    'INSERT INTO reviews (product_id, user_id, name, rating, title, body, photo, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    row.id,
    req.user.id,
    req.user.name,
    req.body.rating,
    req.body.title,
    req.body.body,
    photo,
    bought ? 1 : 0,
  );

  const review = reviewFromRow(await db.get('SELECT * FROM reviews WHERE id = ?', lastInsertRowid));
  notifyAdmins('review', { id: review.id, product: row.name, rating: review.rating });
  res.status(201).json({ review });
});

export default router;
