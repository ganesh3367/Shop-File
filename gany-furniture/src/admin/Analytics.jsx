import { useMemo, useState } from 'react';
import { CATEGORIES, formatPrice } from '../data/products';
import { compactINR, isRevenue } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { BarList, Empty, RevenueChart, StatTile } from './ui';

const RANGES = [3, 6, 12];

// Calendar month in the browser's time zone (orders are stored in UTC; an order at 1 am IST on the 1st belongs to that month).
const monthKey = (dateish) => {
  const d = new Date(dateish);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthStart = (offset) => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - offset);
  return d;
};

/**
 * Business analytics computed from the order history: monthly revenue, new vs returning customers,
 * category and city mix, payment methods and returns.
 */
export default function Analytics() {
  const { orders, returns } = useAdmin();
  const [months, setMonths] = useState(6);

  const a = useMemo(() => {
    const paid = orders.filter(isRevenue);
    const from = monthStart(months - 1);
    const inRange = paid.filter((o) => new Date(o.date) >= from);

    // First order date per customer, across all history, decides "new" vs "returning".
    const firstOrder = new Map();
    [...paid].reverse().forEach((o) => {
      const k = o.customer.email.toLowerCase();
      if (!firstOrder.has(k)) firstOrder.set(k, monthKey(o.date));
    });

    const series = Array.from({ length: months }, (_, i) => {
      const start = monthStart(months - 1 - i);
      const key = monthKey(start);
      const list = paid.filter((o) => monthKey(o.date) === key);
      const customers = new Set(list.map((o) => o.customer.email.toLowerCase()));
      const fresh = [...customers].filter((c) => firstOrder.get(c) === key).length;
      const revenue = list.reduce((s, o) => s + o.total, 0);
      const byCat = Object.fromEntries(
        CATEGORIES.map((c) => [
          c.slug,
          list
            .flatMap((o) => o.items)
            .filter((it) => it.category === c.slug)
            .reduce((s, it) => s + it.price * it.qty, 0),
        ]),
      );
      return {
        date: start.toISOString(),
        key,
        revenue,
        orders: list.length,
        aov: list.length ? Math.round(revenue / list.length) : 0,
        newCustomers: fresh,
        returningCustomers: customers.size - fresh,
        byCat,
      };
    });

    const tally = (fn) => {
      const m = new Map();
      inRange.forEach((o) => {
        const k = fn(o);
        m.set(k, (m.get(k) ?? 0) + o.total);
      });
      return [...m].map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value);
    };

    const customers = new Map();
    inRange.forEach((o) => {
      const k = o.customer.email.toLowerCase();
      customers.set(k, (customers.get(k) ?? 0) + 1);
    });
    const repeat = [...customers.values()].filter((n) => n > 1).length;
    const delivered = orders.filter((o) => o.status === 'Delivered' && new Date(o.date) >= from).length;
    const returned = returns.filter((r) => r.status !== 'Rejected' && new Date(r.date) >= from).length;
    const revenue = inRange.reduce((s, o) => s + o.total, 0);

    return {
      series,
      revenue,
      orders: inRange.length,
      aov: inRange.length ? Math.round(revenue / inRange.length) : 0,
      repeatRate: customers.size ? (repeat / customers.size) * 100 : 0,
      returnRate: delivered ? (returned / delivered) * 100 : 0,
      discount: inRange.reduce((s, o) => s + (o.discount ?? 0), 0),
      category: CATEGORIES.map((c) => ({ label: c.name, value: series.reduce((s, m) => s + m.byCat[c.slug], 0) })),
      cities: tally((o) => o.customer.city.trim() || 'Unknown').slice(0, 8),
      payments: tally((o) => o.payment),
      shipping: tally((o) => o.method),
    };
  }, [orders, returns, months]);

  if (orders.length === 0) {
    return (
      <>
        <PageHead title="Analytics" />
        <Empty title="No data yet">
          <p className="muted">Analytics appear once orders come in. You can load sample data from the dashboard.</p>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHead title="Analytics">
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r} className={months === r ? 'is-active' : ''} onClick={() => setMonths(r)}>
              <span>{r} months</span>
            </button>
          ))}
        </div>
      </PageHead>

      <section className="tiles tiles--5">
        <StatTile label="Revenue" value={compactINR(a.revenue)} />
        <StatTile label="Orders" value={a.orders} />
        <StatTile label="Average order" value={compactINR(a.aov)} />
        <StatTile label="Repeat customers" value={`${a.repeatRate.toFixed(0)}%`} />
        <StatTile label="Return rate" value={`${a.returnRate.toFixed(1)}%`} />
      </section>

      <section className="admin-grid">
        <div className="panel panel--tall">
          <h3 className="panel__title">Revenue by month</h3>
          <RevenueChart data={a.series} unit="month" />
        </div>
        <div className="panel">
          <h3 className="panel__title">Sales by category</h3>
          <BarList rows={a.category} format={formatPrice} />
        </div>
        <div className="panel">
          <h3 className="panel__title">Top cities</h3>
          <BarList rows={a.cities} format={formatPrice} />
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel panel--tall">
          <h3 className="panel__title">New customers by month</h3>
          <RevenueChart
            data={a.series}
            unit="month"
            label="New customers"
            value={(d) => d.newCustomers}
            format={(n) => n.toLocaleString('en-IN')}
            axis={(n) => n.toLocaleString('en-IN')}
            detail={(d) => `${d.returningCustomers} returning`}
          />
        </div>
        <div className="panel">
          <h3 className="panel__title">Payment methods</h3>
          <BarList rows={a.payments} format={formatPrice} />
        </div>
        <div className="panel">
          <h3 className="panel__title">Shipping methods</h3>
          <BarList rows={a.shipping} format={formatPrice} />
          <p className="muted small analytics__note">Discounts given in this period: {formatPrice(a.discount)}</p>
        </div>
      </section>

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Orders</th>
                <th className="num">Revenue</th>
                <th className="num">Avg order</th>
                <th className="num">New</th>
                <th className="num">Returning</th>
                {CATEGORIES.map((c) => (
                  <th key={c.slug} className="num">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...a.series].reverse().map((m) => (
                <tr key={m.key}>
                  <td>{new Date(m.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
                  <td className="num">{m.orders}</td>
                  <td className="num">
                    <strong>{formatPrice(m.revenue)}</strong>
                  </td>
                  <td className="num">{formatPrice(m.aov)}</td>
                  <td className="num">{m.newCustomers}</td>
                  <td className="num">{m.returningCustomers}</td>
                  {CATEGORIES.map((c) => (
                    <td key={c.slug} className="num muted">
                      {formatPrice(m.byCat[c.slug])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
