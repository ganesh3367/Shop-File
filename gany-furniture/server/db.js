import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { SEED_PRODUCTS } from '../src/data/products.js';

const file = process.env.DB_FILE ?? path.resolve('data/gany.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";
export const now = () => new Date().toISOString();

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS products (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL CHECK (category IN ('seating', 'tables', 'lighting')),
    type         TEXT NOT NULL,
    price        INTEGER NOT NULL CHECK (price > 0),
    compare_at   INTEGER,
    image        TEXT NOT NULL,
    badge        TEXT,
    stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    colors       TEXT NOT NULL,              -- JSON [{ name, hex }]
    materials    TEXT NOT NULL,              -- JSON [string]
    story        TEXT NOT NULL,
    dimensions   TEXT NOT NULL,
    model_url    TEXT,
    model_credit TEXT,
    featured     INTEGER NOT NULL DEFAULT 0,
    active       INTEGER NOT NULL DEFAULT 1,
    seed_rating  REAL NOT NULL DEFAULT 0,
    seed_reviews INTEGER NOT NULL DEFAULT 0,
    sort         INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT ${NOW},
    updated_at   TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT NOT NULL,
    address     TEXT NOT NULL,
    city        TEXT NOT NULL,
    state       TEXT NOT NULL,
    zip         TEXT NOT NULL,
    country     TEXT NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    method      TEXT NOT NULL,
    payment     TEXT NOT NULL,
    subtotal    INTEGER NOT NULL,
    discount    INTEGER NOT NULL DEFAULT 0,
    coupon_code TEXT,
    shipping    INTEGER NOT NULL,
    gst         INTEGER NOT NULL,
    total       INTEGER NOT NULL,
    demo        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS orders_email ON orders(email COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    image      TEXT NOT NULL,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 10),
    color      TEXT NOT NULL,
    material   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS items_product ON order_items(product_id);

  CREATE TABLE IF NOT EXISTS order_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    note       TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS returns (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason        TEXT NOT NULL,
    details       TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'Requested'
                  CHECK (status IN ('Requested', 'Approved', 'Rejected', 'Refunded')),
    refund_amount INTEGER,
    admin_note    TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT ${NOW},
    updated_at    TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS returns_order ON returns(order_id);

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    photo      TEXT,
    verified   INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS reviews_product ON reviews(product_id, status);

  CREATE TABLE IF NOT EXISTS coupons (
    code         TEXT PRIMARY KEY COLLATE NOCASE,
    kind         TEXT NOT NULL CHECK (kind IN ('percent', 'fixed')),
    value        INTEGER NOT NULL CHECK (value > 0),
    min_subtotal INTEGER NOT NULL DEFAULT 0,
    max_uses     INTEGER,
    used         INTEGER NOT NULL DEFAULT 0,
    expires_at   TEXT,
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT NOT NULL DEFAULT 'Home',
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    address    TEXT NOT NULL,
    city       TEXT NOT NULL,
    state      TEXT NOT NULL,
    zip        TEXT NOT NULL,
    country    TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_name TEXT NOT NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    details    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    topic      TEXT NOT NULL,
    message    TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    email      TEXT PRIMARY KEY COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
`);

// ---------------------------------------------------------------------------
// Migrations for databases created by earlier versions of the app.
// ---------------------------------------------------------------------------
const hasColumn = (table, col) =>
  db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === col);
if (!hasColumn('orders', 'discount')) db.exec('ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0');
if (!hasColumn('orders', 'coupon_code')) db.exec('ALTER TABLE orders ADD COLUMN coupon_code TEXT');
if (!hasColumn('order_events', 'note')) db.exec('ALTER TABLE order_events ADD COLUMN note TEXT');

// ---------------------------------------------------------------------------
// Seed the catalogue on first start; afterwards it's managed from the admin panel.
// ---------------------------------------------------------------------------
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, category, type, price, compare_at, image, badge, stock, colors, materials, story,
                          dimensions, model_url, model_credit, featured, active, seed_rating, seed_reviews, sort)
    VALUES (@id, @name, @category, @type, @price, @compareAt, @image, @badge, @stock, @colors, @materials, @story,
            @dimensions, @modelUrl, @modelCredit, @featured, 1, @rating, @reviews, @sort)
  `);
  db.transaction(() => {
    SEED_PRODUCTS.forEach((p, i) =>
      insert.run({
        ...p,
        colors: JSON.stringify(p.colors),
        materials: JSON.stringify(p.materials),
        featured: p.featured ? 1 : 0,
        sort: i,
      }),
    );
  })();
  console.log(`[setup] Seeded ${SEED_PRODUCTS.length} products`);
}

// A starter coupon so the discount flow can be demoed straight away.
db.prepare("INSERT OR IGNORE INTO coupons (code, kind, value, min_subtotal) VALUES ('WELCOME10', 'percent', 10, 10000)").run();

/**
 * JWT signing secret. Uses JWT_SECRET when set; otherwise generates one once and keeps it
 * in the database so logins survive server restarts in development.
 */
export function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  const row = db.prepare("SELECT value FROM settings WHERE key = 'jwt_secret'").get();
  if (row) return row.value;
  const secret = crypto.randomBytes(48).toString('hex');
  db.prepare("INSERT INTO settings (key, value) VALUES ('jwt_secret', ?)").run(secret);
  return secret;
}

/** Make sure at least one admin account exists. */
export function ensureAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;

  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to create the first admin');
    email = 'admin@ganys.in';
    password = 'gany@admin';
    console.warn(`[setup] Created development admin ${email} / ${password}. Set ADMIN_EMAIL and ADMIN_PASSWORD for real use.`);
  }
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run(
    'Admin',
    email,
    bcrypt.hashSync(password, 10),
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const reviewStats = db.prepare(
  "SELECT COUNT(*) AS n, COALESCE(SUM(rating), 0) AS total FROM reviews WHERE product_id = ? AND status = 'Approved'",
);

/** DB row → the product shape the frontend uses. Rating blends the launch rating with approved reviews. */
export function productFromRow(r) {
  const { n, total } = reviewStats.get(r.id);
  const count = r.seed_reviews + n;
  const rating = count ? Math.round(((r.seed_rating * r.seed_reviews + total) / count) * 10) / 10 : 0;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    type: r.type,
    price: r.price,
    compareAt: r.compare_at,
    image: r.image,
    badge: r.badge,
    stock: r.stock,
    colors: JSON.parse(r.colors),
    materials: JSON.parse(r.materials),
    story: r.story,
    dimensions: r.dimensions,
    modelUrl: r.model_url,
    modelCredit: r.model_credit,
    featured: !!r.featured,
    active: !!r.active,
    rating,
    reviews: count,
    updatedAt: r.updated_at,
  };
}

export const getProductRow = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Shape DB order rows (+ items, events, latest return) the way the frontend expects. */
export function hydrateOrders(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY id`).all(...ids);
  const events = db.prepare(`SELECT * FROM order_events WHERE order_id IN (${marks}) ORDER BY created_at, id`).all(...ids);
  const returns = db.prepare(`SELECT * FROM returns WHERE order_id IN (${marks}) ORDER BY id`).all(...ids);

  return rows.map((o) => {
    const ret = returns.filter((r) => r.order_id === o.id).at(-1);
    return {
      id: o.id,
      userId: o.user_id,
      date: o.created_at,
      status: o.status,
      demo: !!o.demo,
      customer: {
        name: o.name,
        email: o.email,
        phone: o.phone,
        address: o.address,
        city: o.city,
        state: o.state,
        zip: o.zip,
        country: o.country,
        notes: o.notes,
      },
      items: items
        .filter((i) => i.order_id === o.id)
        .map((i) => ({
          id: i.product_id,
          name: i.name,
          category: i.category,
          image: i.image,
          price: i.price,
          qty: i.qty,
          color: i.color,
          material: i.material,
        })),
      history: events.filter((e) => e.order_id === o.id).map((e) => ({ status: e.status, note: e.note, date: e.created_at })),
      return: ret ? returnFromRow(ret) : null,
      subtotal: o.subtotal,
      discount: o.discount,
      couponCode: o.coupon_code,
      shipping: o.shipping,
      gst: o.gst,
      total: o.total,
      method: o.method,
      payment: o.payment,
    };
  });
}

export const returnFromRow = (r) => ({
  id: r.id,
  orderId: r.order_id,
  reason: r.reason,
  details: r.details,
  status: r.status,
  refundAmount: r.refund_amount,
  adminNote: r.admin_note,
  date: r.created_at,
  updatedAt: r.updated_at,
});

export const getOrder = (id) => hydrateOrders(db.prepare('SELECT * FROM orders WHERE id = ?').all(id))[0] ?? null;
export const allOrders = () => hydrateOrders(db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all());

export class StockError extends Error {}

const insertOrder = db.prepare(`
  INSERT INTO orders (id, user_id, status, name, email, phone, address, city, state, zip, country, notes,
                      method, payment, subtotal, discount, coupon_code, shipping, gst, total, demo, created_at)
  VALUES (@id, @user_id, @status, @name, @email, @phone, @address, @city, @state, @zip, @country, @notes,
          @method, @payment, @subtotal, @discount, @coupon_code, @shipping, @gst, @total, @demo, @created_at)
`);
const insertItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, name, category, image, price, qty, color, material)
  VALUES (@order_id, @product_id, @name, @category, @image, @price, @qty, @color, @material)
`);
const insertEvent = db.prepare('INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)');
const takeStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
const giveStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

/**
 * Insert a priced order with its items and first status event, atomically.
 * Real orders reserve stock (failing cleanly if it ran out) and use up a coupon.
 */
export const saveOrder = db.transaction((order, { reserveStock = true } = {}) => {
  if (reserveStock) {
    for (const it of order.items) {
      if (takeStock.run(it.qty, it.product_id, it.qty).changes === 0) {
        const left = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id)?.stock ?? 0;
        throw new StockError(left === 0 ? `${it.name} just sold out` : `Only ${left} of ${it.name} left in stock`);
      }
    }
  }
  insertOrder.run({ discount: 0, coupon_code: null, ...order });
  for (const it of order.items) insertItem.run({ ...it, order_id: order.id });
  insertEvent.run(order.id, order.status, null, order.created_at);
  if (order.coupon_code) db.prepare('UPDATE coupons SET used = used + 1 WHERE code = ?').run(order.coupon_code);
});

/** Put an order's items back on the shelf (cancellation, refund). */
export function restock(orderId) {
  for (const it of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(orderId))
    giveStock.run(it.qty, it.product_id);
}

/** Take an order's items off the shelf again (un-cancelling). Throws StockError if not possible. */
export function unrestock(orderId) {
  for (const it of db.prepare('SELECT product_id, name, qty FROM order_items WHERE order_id = ?').all(orderId)) {
    if (takeStock.run(it.qty, it.product_id, it.qty).changes === 0)
      throw new StockError(`Not enough stock of ${it.name} to reopen this order`);
  }
}

export const addOrderEvent = (orderId, status, note = null) => insertEvent.run(orderId, status, note, now());

export function newOrderId() {
  const exists = db.prepare('SELECT 1 FROM orders WHERE id = ?');
  for (;;) {
    const id = `GNY-${crypto.randomInt(100000, 999999)}`;
    if (!exists.get(id)) return id;
  }
}

// ---------------------------------------------------------------------------
// Admin activity log
// ---------------------------------------------------------------------------
export function logActivity(user, action, entity, entityId, details = '') {
  db.prepare('INSERT INTO activity (admin_id, admin_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    user?.id ?? null,
    user?.name ?? 'System',
    action,
    entity,
    entityId == null ? null : String(entityId),
    details,
  );
}
