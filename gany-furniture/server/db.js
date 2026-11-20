import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { SEED_PRODUCTS } from '../src/data/products.js';

/**
 * Database connection.
 * - Production (e.g. Render free plan): a hosted Turso database, via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * - Development: a local SQLite file (DB_FILE, default data/gany.db).
 * Both speak the same SQL, so the rest of the server doesn't care which one it's using.
 */
const remoteUrl = process.env.TURSO_DATABASE_URL;
let url = remoteUrl;
if (!url) {
  const file = path.resolve(process.env.DB_FILE ?? 'data/gany.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  url = `file:${file}`;
}
export const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
export const usingRemote = !!remoteUrl;

export const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Query helpers. `db` works on the main connection; inside withTx() the same
// helpers run on the transaction, so code can be shared between both.
// ---------------------------------------------------------------------------
const toObj = (rs, row) => Object.fromEntries(rs.columns.map((c) => [c, row[c]]));

function helpers(exec) {
  return {
    async all(sql, ...args) {
      const rs = await exec({ sql, args });
      return rs.rows.map((r) => toObj(rs, r));
    },
    async get(sql, ...args) {
      const rs = await exec({ sql, args });
      return rs.rows[0] ? toObj(rs, rs.rows[0]) : undefined;
    },
    async run(sql, ...args) {
      const rs = await exec({ sql, args });
      return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid == null ? null : Number(rs.lastInsertRowid) };
    },
  };
}

export const db = helpers((stmt) => client.execute(stmt));

/** Run fn inside a write transaction: commits if it resolves, rolls back if it throws. */
export async function withTx(fn) {
  const tx = await client.transaction('write');
  try {
    const result = await fn(helpers((stmt) => tx.execute(stmt)));
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}

/** Several independent writes in one round trip, all-or-nothing. */
export const batch = (stmts) =>
  client.batch(
    stmts.map(([sql, ...args]) => ({ sql, args })),
    'write',
  );

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

const SCHEMA = `
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
    colors       TEXT NOT NULL,
    materials    TEXT NOT NULL,
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
    user_id     INTEGER REFERENCES users(id),
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
    order_id   TEXT NOT NULL REFERENCES orders(id),
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
    order_id   TEXT NOT NULL REFERENCES orders(id),
    status     TEXT NOT NULL,
    note       TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_order ON order_events(order_id);

  CREATE TABLE IF NOT EXISTS returns (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      TEXT NOT NULL REFERENCES orders(id),
    user_id       INTEGER REFERENCES users(id),
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
    product_id TEXT NOT NULL REFERENCES products(id),
    user_id    INTEGER REFERENCES users(id),
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
    user_id    INTEGER NOT NULL REFERENCES users(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
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
    user_id    INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER REFERENCES users(id),
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

  -- Uploaded images and 3D models, stored in the database so they survive on hosts without a disk.
  CREATE TABLE IF NOT EXISTS files (
    name       TEXT PRIMARY KEY,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    data       BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
`;

let SECRET = null;

/** Create/upgrade tables, seed the catalogue and the first admin. Call once before serving requests. */
export async function initDb() {
  if (!usingRemote) await client.execute('PRAGMA journal_mode = WAL');
  await client.executeMultiple(SCHEMA);

  // Upgrades for databases created by earlier versions of the app.
  const hasColumn = async (table, col) => (await db.all(`PRAGMA table_info(${table})`)).some((c) => c.name === col);
  if (!(await hasColumn('orders', 'discount'))) await client.execute('ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0');
  if (!(await hasColumn('orders', 'coupon_code'))) await client.execute('ALTER TABLE orders ADD COLUMN coupon_code TEXT');
  if (!(await hasColumn('order_events', 'note'))) await client.execute('ALTER TABLE order_events ADD COLUMN note TEXT');

  // Catalogue: seeded once, then managed from the admin panel.
  if ((await db.get('SELECT COUNT(*) AS n FROM products')).n === 0) {
    await batch(
      SEED_PRODUCTS.map((p, i) => [
        `INSERT INTO products (id, name, category, type, price, compare_at, image, badge, stock, colors, materials, story,
                               dimensions, model_url, model_credit, featured, active, seed_rating, seed_reviews, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        p.id,
        p.name,
        p.category,
        p.type,
        p.price,
        p.compareAt,
        p.image,
        p.badge,
        p.stock,
        JSON.stringify(p.colors),
        JSON.stringify(p.materials),
        p.story,
        p.dimensions,
        p.modelUrl,
        p.modelCredit,
        p.featured ? 1 : 0,
        p.rating,
        p.reviews,
        i,
      ]),
    );
    console.log(`[setup] Seeded ${SEED_PRODUCTS.length} products`);
  }

  // A starter coupon so the discount flow can be demoed straight away.
  await db.run("INSERT OR IGNORE INTO coupons (code, kind, value, min_subtotal) VALUES ('WELCOME10', 'percent', 10, 10000)");

  SECRET = await loadSecret();
  await ensureAdmin();
  console.log(`[db] ${usingRemote ? 'Connected to Turso' : `Using local file ${url.slice(5)}`}`);
}

/** JWT signing secret: JWT_SECRET if set, otherwise generated once and kept in the database. */
async function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  const row = await db.get("SELECT value FROM settings WHERE key = 'jwt_secret'");
  if (row) return row.value;
  const secret = crypto.randomBytes(48).toString('hex');
  await db.run("INSERT INTO settings (key, value) VALUES ('jwt_secret', ?)", secret);
  return secret;
}

export const jwtSecret = () => {
  if (!SECRET) throw new Error('initDb() has not run yet');
  return SECRET;
};

/** Make sure at least one admin account exists. */
async function ensureAdmin() {
  if (await db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1")) return;
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to create the first admin');
    email = 'admin@ganys.in';
    password = 'gany@admin';
    console.warn(`[setup] Created development admin ${email} / ${password}. Set ADMIN_EMAIL and ADMIN_PASSWORD for real use.`);
  }
  await db.run(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    'Admin',
    email,
    bcrypt.hashSync(password, 10),
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** Approved-review counts and rating totals for every product, in one query. */
async function reviewStatsMap(ids) {
  const where = ids ? `AND product_id IN (${ids.map(() => '?').join(',')})` : '';
  const rows = await db.all(
    `SELECT product_id, COUNT(*) AS n, COALESCE(SUM(rating), 0) AS total FROM reviews WHERE status = 'Approved' ${where} GROUP BY product_id`,
    ...(ids ?? []),
  );
  return new Map(rows.map((r) => [r.product_id, r]));
}

/** DB row → the product shape the frontend uses. Rating blends the launch rating with approved reviews. */
function productFromRow(r, stats) {
  const { n = 0, total = 0 } = stats.get(r.id) ?? {};
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

export async function productsFromRows(rows) {
  const stats = await reviewStatsMap(rows.length < 50 ? rows.map((r) => r.id) : null);
  return rows.map((r) => productFromRow(r, stats));
}

export const getProductRow = (id) => db.get('SELECT * FROM products WHERE id = ?', id);
export async function getProduct(id) {
  const row = await getProductRow(id);
  return row ? (await productsFromRows([row]))[0] : null;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
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

/** Shape DB order rows (+ items, events, latest return) the way the frontend expects. Three queries in total. */
export async function hydrateOrders(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const [items, events, returns] = await Promise.all([
    db.all(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY id`, ...ids),
    db.all(`SELECT * FROM order_events WHERE order_id IN (${marks}) ORDER BY created_at, id`, ...ids),
    db.all(`SELECT * FROM returns WHERE order_id IN (${marks}) ORDER BY id`, ...ids),
  ]);
  const group = (list) => {
    const m = new Map();
    for (const x of list) (m.get(x.order_id) ?? m.set(x.order_id, []).get(x.order_id)).push(x);
    return m;
  };
  const byItems = group(items);
  const byEvents = group(events);
  const byReturns = group(returns);

  return rows.map((o) => {
    const ret = byReturns.get(o.id)?.at(-1);
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
      items: (byItems.get(o.id) ?? []).map((i) => ({
        id: i.product_id,
        name: i.name,
        category: i.category,
        image: i.image,
        price: i.price,
        qty: i.qty,
        color: i.color,
        material: i.material,
      })),
      history: (byEvents.get(o.id) ?? []).map((e) => ({ status: e.status, note: e.note, date: e.created_at })),
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

export const getOrder = async (id) => (await hydrateOrders(await db.all('SELECT * FROM orders WHERE id = ?', id)))[0] ?? null;
export const allOrders = async () => hydrateOrders(await db.all('SELECT * FROM orders ORDER BY created_at DESC'));

export class StockError extends Error {}

const ORDER_SQL = `
  INSERT INTO orders (id, user_id, status, name, email, phone, address, city, state, zip, country, notes,
                      method, payment, subtotal, discount, coupon_code, shipping, gst, total, demo, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const ITEM_SQL = `
  INSERT INTO order_items (order_id, product_id, name, category, image, price, qty, color, material)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** The INSERT statements for an order, its items and its first status event. */
function orderStatements(o) {
  return [
    [
      ORDER_SQL,
      o.id,
      o.user_id,
      o.status,
      o.name,
      o.email,
      o.phone,
      o.address,
      o.city,
      o.state,
      o.zip,
      o.country,
      o.notes ?? '',
      o.method,
      o.payment,
      o.subtotal,
      o.discount ?? 0,
      o.coupon_code ?? null,
      o.shipping,
      o.gst,
      o.total,
      o.demo ?? 0,
      o.created_at,
    ],
    ...o.items.map((it) => [ITEM_SQL, o.id, it.product_id, it.name, it.category, it.image, it.price, it.qty, it.color, it.material]),
    ['INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, NULL, ?)', o.id, o.status, o.created_at],
  ];
}

/**
 * Save a real order atomically: reserve stock (failing cleanly if it ran out), insert the order,
 * and use up its coupon. Two shoppers can't buy the last item at the same time.
 */
export async function saveOrder(order) {
  await withTx(async (tx) => {
    for (const it of order.items) {
      const { changes } = await tx.run('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', it.qty, it.product_id, it.qty);
      if (changes === 0) {
        const left = (await tx.get('SELECT stock FROM products WHERE id = ?', it.product_id))?.stock ?? 0;
        throw new StockError(left === 0 ? `${it.name} just sold out` : `Only ${left} of ${it.name} left in stock`);
      }
    }
    for (const [sql, ...args] of orderStatements(order)) await tx.run(sql, ...args);
    if (order.coupon_code) await tx.run('UPDATE coupons SET used = used + 1 WHERE code = ?', order.coupon_code);
  });
}

/** Sample orders don't touch stock or coupons, so they go in as one fast batch. */
export const saveSampleOrders = (orders) => batch(orders.flatMap(orderStatements));

/** Delete orders and everything hanging off them. */
export async function deleteOrders(whereSql, ...args) {
  const sub = `SELECT id FROM orders WHERE ${whereSql}`;
  await batch([
    [`DELETE FROM order_items WHERE order_id IN (${sub})`, ...args],
    [`DELETE FROM order_events WHERE order_id IN (${sub})`, ...args],
    [`DELETE FROM returns WHERE order_id IN (${sub})`, ...args],
    [`DELETE FROM orders WHERE ${whereSql}`, ...args],
  ]);
}

/** Put an order's items back on the shelf (cancellation, refund). */
export async function restock(tx, orderId) {
  for (const it of await tx.all('SELECT product_id, qty FROM order_items WHERE order_id = ?', orderId)) {
    await tx.run('UPDATE products SET stock = stock + ? WHERE id = ?', it.qty, it.product_id);
  }
}

/** Take an order's items off the shelf again (reopening a cancelled order). */
export async function unrestock(tx, orderId) {
  for (const it of await tx.all('SELECT product_id, name, qty FROM order_items WHERE order_id = ?', orderId)) {
    const { changes } = await tx.run('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', it.qty, it.product_id, it.qty);
    if (changes === 0) throw new StockError(`Not enough stock of ${it.name} to reopen this order`);
  }
}

export const addOrderEvent = (q, orderId, status, note = null) =>
  q.run('INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)', orderId, status, note, now());

export async function newOrderId() {
  for (;;) {
    const id = `GNY-${crypto.randomInt(100000, 999999)}`;
    if (!(await db.get('SELECT 1 AS x FROM orders WHERE id = ?', id))) return id;
  }
}

// ---------------------------------------------------------------------------
// Admin activity log
// ---------------------------------------------------------------------------
export const logActivity = (user, action, entity, entityId, details = '', q = db) =>
  q.run(
    'INSERT INTO activity (admin_id, admin_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
    user?.id ?? null,
    user?.name ?? 'System',
    action,
    entity,
    entityId == null ? null : String(entityId),
    details ?? '',
  );
