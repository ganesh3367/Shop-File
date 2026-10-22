// The server prices every order from the same catalogue the storefront uses,
// so totals can't be tampered with from the browser.
import { FREE_SHIPPING_AT, getProduct } from '../src/data/products.js';

const SHIPPING_METHODS = {
  ground: { name: 'Ground', price: 0 },
  air: { name: 'Air', price: 1499 },
  express: { name: 'Express', price: 2999 },
};

export const PAYMENT_METHODS = { upi: 'UPI', card: 'Card', cod: 'Pay on delivery' };

const GST_RATE = 0.18;

export class PricingError extends Error {}

/** Returns priced line items and totals, or throws PricingError with a user-facing message. */
export function priceOrder(items, methodId) {
  const method = SHIPPING_METHODS[methodId];
  if (!method) throw new PricingError('Unknown shipping method');

  const lines = items.map((it) => {
    const p = getProduct(it.id);
    if (!p) throw new PricingError(`Product "${it.id}" is no longer available`);
    if (!p.colors.some((c) => c.name === it.color)) throw new PricingError(`${p.name} isn't available in ${it.color}`);
    if (!p.materials.includes(it.material)) throw new PricingError(`${p.name} isn't available in ${it.material}`);
    return {
      product_id: p.id,
      name: p.name,
      category: p.category,
      image: p.image,
      price: p.price,
      qty: it.qty,
      color: it.color,
      material: it.material,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = methodId === 'ground' && subtotal >= FREE_SHIPPING_AT ? 0 : method.price;
  const gst = Math.round(subtotal * GST_RATE);
  return { lines, subtotal, shipping, gst, total: subtotal + shipping + gst, method: method.name };
}
