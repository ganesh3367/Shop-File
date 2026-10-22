import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const file = process.env.DB_FILE ?? path.resolve('data/gany.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status     TEXT NOT NULL DEFAULT 'Pending'
               CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT NOT NULL,
    address    TEXT NOT NULL,
    city       TEXT NOT NULL,
    state      TEXT NOT NULL,
    zip        TEXT NOT NULL,
    country    TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    method     TEXT NOT NULL,
    payment    TEXT NOT NULL,
    subtotal   INTEGER NOT NULL,
    shipping   INTEGER NOT NULL,
    gst        INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    demo       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);

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

  CREATE TABLE IF NOT EXISTS order_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    topic      TEXT NOT NULL,
    message    TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    email      TEXT PRIMARY KEY COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

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

/** Shape a DB order row (+ its items and events) the way the frontend expects. */
export function hydrateOrders(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY id`).all(...ids);
  const events = db.prepare(`SELECT * FROM order_events WHERE order_id IN (${marks}) ORDER BY created_at, id`).all(...ids);

  return rows.map((o) => ({
    id: o.id,
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
    history: events.filter((e) => e.order_id === o.id).map((e) => ({ status: e.status, date: e.created_at })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    gst: o.gst,
    total: o.total,
    method: o.method,
    payment: o.payment,
  }));
}

const insertOrder = db.prepare(`
  INSERT INTO orders (id, user_id, status, name, email, phone, address, city, state, zip, country, notes,
                      method, payment, subtotal, shipping, gst, total, demo, created_at)
  VALUES (@id, @user_id, @status, @name, @email, @phone, @address, @city, @state, @zip, @country, @notes,
          @method, @payment, @subtotal, @shipping, @gst, @total, @demo, @created_at)
`);
const insertItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, name, category, image, price, qty, color, material)
  VALUES (@order_id, @product_id, @name, @category, @image, @price, @qty, @color, @material)
`);
const insertEvent = db.prepare('INSERT INTO order_events (order_id, status, created_at) VALUES (?, ?, ?)');

/** Insert a fully-priced order with its items and first status event, atomically. */
export const saveOrder = db.transaction((order) => {
  insertOrder.run(order);
  for (const it of order.items) insertItem.run({ ...it, order_id: order.id });
  insertEvent.run(order.id, order.status, order.created_at);
});

export function newOrderId() {
  const exists = db.prepare('SELECT 1 FROM orders WHERE id = ?');
  for (;;) {
    const id = `GNY-${crypto.randomInt(100000, 999999)}`;
    if (!exists.get(id)) return id;
  }
}
