import { CheckCircle2, Clock, Loader, Truck, XCircle } from 'lucide-react';
import { PRODUCTS } from '../data/products';

export const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Status colour always ships with an icon + label, never colour alone.
export const STATUS_META = {
  Pending: { color: '#fab219', icon: Clock },
  Processing: { color: 'var(--muted)', icon: Loader },
  Shipped: { color: 'var(--accent)', icon: Truck },
  Delivered: { color: '#0ca30c', icon: CheckCircle2 },
  Cancelled: { color: '#d03b3b', icon: XCircle },
};

export const DAY = 864e5;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const fmtDate = (iso, opts = { day: 'numeric', month: 'short' }) => new Date(iso).toLocaleDateString('en-IN', opts);
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** ₹1.2L / ₹45K style compact currency for tiles and axes. */
export const compactINR = (n) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return `₹${n}`;
};

/** Revenue counts every order that wasn't cancelled. */
export const isRevenue = (o) => o.status !== 'Cancelled';

export function rangeOrders(orders, days, offsetDays = 0) {
  const end = startOfDay(Date.now() - offsetDays * DAY).getTime() + DAY;
  const start = end - days * DAY;
  return orders.filter((o) => {
    const t = new Date(o.date).getTime();
    return t >= start && t < end;
  });
}

export function dailySeries(orders, days) {
  const today = startOfDay(Date.now()).getTime();
  return Array.from({ length: days }, (_, i) => {
    const dayStart = today - (days - 1 - i) * DAY;
    const dayOrders = orders.filter((o) => {
      const t = new Date(o.date).getTime();
      return t >= dayStart && t < dayStart + DAY && isRevenue(o);
    });
    return { date: new Date(dayStart).toISOString(), revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length };
  });
}

export function customersFrom(orders) {
  const map = new Map();
  for (const o of orders) {
    const key = o.customer.email.toLowerCase();
    const c = map.get(key) ?? {
      email: o.customer.email,
      name: o.customer.name,
      phone: o.customer.phone,
      city: o.customer.city,
      orders: 0,
      spent: 0,
      last: o.date,
    };
    c.orders += 1;
    if (isRevenue(o)) c.spent += o.total;
    if (o.date > c.last) c.last = o.date;
    map.set(key, c);
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

export function productStats(orders) {
  const stats = Object.fromEntries(PRODUCTS.map((p) => [p.id, { units: 0, revenue: 0 }]));
  for (const o of orders.filter(isRevenue)) {
    for (const it of o.items) {
      if (!stats[it.id]) continue;
      stats[it.id].units += it.qty;
      stats[it.id].revenue += it.price * it.qty;
    }
  }
  return stats;
}

export function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
