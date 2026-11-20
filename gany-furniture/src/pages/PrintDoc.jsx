import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { adminToken, api } from '../lib/api';
import { formatPrice } from '../data/products';
import { BUSINESS } from '../data/business';
import '../styles/print.css';

const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Printable invoice / packing slip. "Download PDF" uses the browser's print-to-PDF,
 * which keeps the ₹ sign and the brand fonts intact.
 *  /print/invoice/:id  — customer (or admin with ?admin=1)
 *  /print/slip/:id     — admin packing slip, no prices
 */
export default function PrintDoc() {
  const { kind, id } = useParams();
  const [params] = useSearchParams();
  const { token } = useStore();
  const asAdmin = params.get('admin') === '1';
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const path = asAdmin ? `/admin/orders/${id}` : `/orders/${id}`;
    const auth = asAdmin ? adminToken.get() : token;
    if (!auth) return setError('Please sign in to view this document.');
    api(path, { token: auth })
      .then((d) => {
        setOrder(d.order);
        document.title = `${kind === 'slip' ? 'Packing slip' : 'Invoice'} ${d.order.id}`;
      })
      .catch((err) => setError(err.message));
  }, [id, asAdmin, token, kind]);

  if (error) return <div className="doc-page doc-page--msg">{error}</div>;
  if (!order) return <div className="doc-page doc-page--msg">Loading…</div>;

  const slip = kind === 'slip';
  const c = order.customer;
  const sameState = c.state.trim().toLowerCase() === BUSINESS.state.toLowerCase();
  const cgst = Math.floor(order.gst / 2);
  const sgst = order.gst - cgst;
  const units = order.items.reduce((s, it) => s + it.qty, 0);

  return (
    <div className="doc-page">
      <div className="doc-toolbar">
        <span>
          {slip ? 'Packing slip' : 'Tax invoice'} · {order.id}
        </span>
        <button className="btn btn--dark btn--sm" onClick={() => window.print()}>
          <Printer size={16} /> {slip ? 'Print' : 'Download PDF / Print'}
        </button>
      </div>

      <article className="doc">
        <header className="doc__head">
          <div>
            <div className="doc__logo">
              Gany's<span>.</span>
            </div>
            <p>
              {BUSINESS.name}
              <br />
              {BUSINESS.address}
              <br />
              {BUSINESS.email} · {BUSINESS.phone}
              {BUSINESS.gstin && (
                <>
                  <br />
                  GSTIN: {BUSINESS.gstin}
                </>
              )}
            </p>
          </div>
          <div className="doc__meta">
            <h1>{slip ? 'Packing slip' : 'Tax invoice'}</h1>
            <dl>
              <dt>{slip ? 'Order' : 'Invoice no.'}</dt>
              <dd>{order.id}</dd>
              <dt>Date</dt>
              <dd>{fmt(order.date)}</dd>
              {!slip && (
                <>
                  <dt>Payment</dt>
                  <dd>{order.payment}</dd>
                </>
              )}
              <dt>Shipping</dt>
              <dd>{order.method}</dd>
            </dl>
          </div>
        </header>

        <section className="doc__parties">
          <div>
            <h4>{slip ? 'Ship to' : 'Bill to'}</h4>
            <p>
              <strong>{c.name}</strong>
              <br />
              {c.address}
              <br />
              {c.city}, {c.state} {c.zip}
              <br />
              {c.country}
              <br />
              {c.phone}
              {!slip && (
                <>
                  <br />
                  {c.email}
                </>
              )}
            </p>
          </div>
          {!slip && (
            <div>
              <h4>Ship to</h4>
              <p>
                {c.name}
                <br />
                {c.address}, {c.city}
                <br />
                {c.state} {c.zip}
              </p>
            </div>
          )}
          {slip && c.notes && (
            <div>
              <h4>Delivery instructions</h4>
              <p>{c.notes}</p>
            </div>
          )}
        </section>

        <table className="doc__table">
          <thead>
            <tr>
              {slip && <th className="doc__tick">✓</th>}
              <th>#</th>
              <th>Item</th>
              <th>Variant</th>
              <th className="num">Qty</th>
              {!slip && <th className="num">Rate</th>}
              {!slip && <th className="num">Amount</th>}
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                {slip && (
                  <td className="doc__tick">
                    <span className="doc__box" />
                  </td>
                )}
                <td>{i + 1}</td>
                <td>
                  <strong>{it.name}</strong>
                  <br />
                  <small>SKU: {it.id}</small>
                </td>
                <td>
                  {it.color} · {it.material}
                </td>
                <td className="num">{it.qty}</td>
                {!slip && <td className="num">{formatPrice(it.price)}</td>}
                {!slip && <td className="num">{formatPrice(it.price * it.qty)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {slip ? (
          <p className="doc__units">
            {units} {units === 1 ? 'piece' : 'pieces'} in this shipment. Check each item before handing over; get the customer's signature
            below.
          </p>
        ) : (
          <dl className="doc__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>Discount ({order.couponCode})</dt>
                <dd>−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Taxable value</dt>
              <dd>{formatPrice(order.subtotal - order.discount)}</dd>
            </div>
            {sameState ? (
              <>
                <div>
                  <dt>CGST @ 9%</dt>
                  <dd>{formatPrice(cgst)}</dd>
                </div>
                <div>
                  <dt>SGST @ 9%</dt>
                  <dd>{formatPrice(sgst)}</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>IGST @ 18%</dt>
                <dd>{formatPrice(order.gst)}</dd>
              </div>
            )}
            <div>
              <dt>Shipping</dt>
              <dd>{order.shipping ? formatPrice(order.shipping) : 'Free'}</dd>
            </div>
            <div className="doc__grand">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        )}

        <footer className="doc__foot">
          {slip ? (
            <div className="doc__sign">
              <span>Received by (name &amp; signature)</span>
              <span>Date</span>
            </div>
          ) : (
            <p>
              Thank you for choosing Gany's Furniture. Returns are accepted within 30 days of delivery (see our Return Policy).
              {!BUSINESS.gstin && ' This is a computer-generated invoice.'}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
