import { PRODUCTS } from '../src/data/products.js';
import { priceOrder } from './pricing.js';

const DAY = 864e5;

const NAMES = [
  ['Ananya Rao', 'Koregaon Park'],
  ['Rohit Kulkarni', 'Baner'],
  ['Meera Joshi', 'Aundh'],
  ['Kabir Shah', 'Viman Nagar'],
  ['Priya Deshmukh', 'Hinjewadi'],
  ['Vikram Jadhav', 'Kothrud'],
  ['Sneha Patil', 'Wakad'],
  ['Arjun Mehta', 'Kalyani Nagar'],
  ['Isha Kapoor', 'Magarpatta'],
  ['Neha Iyer', 'Shivajinagar'],
  ['Aditya Pawar', 'Hadapsar'],
  ['Riya Sharma', 'Pimple Saudagar'],
];

// Seeded PRNG (mulberry32) so the sample set is the same every time.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~46 realistic orders spread over the last six weeks, all flagged demo = 1. */
export function makeSampleOrders(count = 46) {
  const r = rng(2024);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.pow(r(), 1.3) * 44);
    const created = new Date(now - daysAgo * DAY - Math.floor(r() * 10) * 36e5).toISOString();
    const [name, area] = pick(NAMES);
    const items = Array.from({ length: 1 + Math.floor(r() * 2.4) }, () => {
      const p = pick(PRODUCTS);
      return { id: p.id, qty: r() > 0.85 ? 2 : 1, color: pick(p.colors).name, material: pick(p.materials) };
    });
    const methodId = pick(['ground', 'ground', 'air', 'express']);
    const priced = priceOrder(items, methodId);
    const status = r() < 0.06 ? 'Cancelled' : daysAgo > 9 ? 'Delivered' : daysAgo > 5 ? 'Shipped' : daysAgo > 2 ? 'Processing' : 'Pending';

    return {
      id: `GNY-S${String(1000 + i)}`,
      user_id: null,
      status,
      name,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      phone: `+91 98${String(10000000 + Math.floor(r() * 89999999))}`,
      address: `${10 + Math.floor(r() * 180)}, ${area}`,
      city: 'Pune',
      state: 'Maharashtra',
      zip: `4110${String(Math.floor(r() * 60)).padStart(2, '0')}`,
      country: 'India',
      notes: '',
      method: priced.method,
      payment: pick(['UPI', 'Card', 'Pay on delivery']),
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      gst: priced.gst,
      total: priced.total,
      demo: 1,
      created_at: created,
      items: priced.lines,
    };
  });
}
