// The server prices every order from the database, so totals can't be tampered with from the browser.
import { FREE_SHIPPING_AT } from '../src/data/products.js';
import { db, getProductRow } from './db.js';

const SHIPPING_METHODS = {
  ground: { name: 'Ground', price: 0 },
  air: { name: 'Air', price: 1499 },
  express: { name: 'Express', price: 2999 },
};

export const PAYMENT_METHODS = { upi: 'UPI', card: 'Card', cod: 'Pay on delivery' };

const GST_RATE = 0.18;

export class PricingError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}
const couponError = (msg) => new PricingError(msg, 'coupon');

/** Look up a coupon and work out its discount on a subtotal, or throw PricingError explaining why not. */
export function applyCoupon(code, subtotal) {
  const c = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code.trim());
  if (!c || !c.active) throw couponError(`“${code}” isn't a valid code`);
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw couponError(`“${c.code}” has expired`);
  if (c.max_uses != null && c.used >= c.max_uses) throw couponError(`“${c.code}” has been fully used`);
  if (subtotal < c.min_subtotal) {
    throw couponError(`“${c.code}” needs a subtotal of at least ₹${c.min_subtotal.toLocaleString('en-IN')}`);
  }
  const discount = c.kind === 'percent' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
  return {
    code: c.code,
    discount,
    label: c.kind === 'percent' ? `${c.value}% off` : `₹${c.value.toLocaleString('en-IN')} off`,
  };
}

/**
 * Price a basket: validates every product, variant and stock level, applies an optional coupon,
 * then adds shipping and GST (on the discounted amount). Throws PricingError with a user-facing message.
 */
export function priceOrder(items, methodId, couponCode, { checkStock = true } = {}) {
  const method = SHIPPING_METHODS[methodId];
  if (!method) throw new PricingError('Unknown shipping method');

  const lines = items.map((it) => {
    const row = getProductRow(it.id);
    if (!row || !row.active) throw new PricingError(`“${it.id}” is no longer available`);
    const colors = JSON.parse(row.colors);
    const materials = JSON.parse(row.materials);
    if (!colors.some((c) => c.name === it.color)) throw new PricingError(`${row.name} isn't available in ${it.color}`);
    if (!materials.includes(it.material)) throw new PricingError(`${row.name} isn't available in ${it.material}`);
    if (checkStock && row.stock < it.qty) {
      throw new PricingError(row.stock === 0 ? `${row.name} is sold out` : `Only ${row.stock} of ${row.name} left in stock`);
    }
    return {
      product_id: row.id,
      name: row.name,
      category: row.category,
      image: row.image,
      price: row.price,
      qty: it.qty,
      color: it.color,
      material: it.material,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const coupon = couponCode ? applyCoupon(couponCode, subtotal) : null;
  const discount = coupon?.discount ?? 0;
  const taxable = subtotal - discount;
  const shipping = methodId === 'ground' && taxable >= FREE_SHIPPING_AT ? 0 : method.price;
  const gst = Math.round(taxable * GST_RATE);
  return { lines, subtotal, discount, coupon, shipping, gst, total: taxable + shipping + gst, method: method.name };
}
