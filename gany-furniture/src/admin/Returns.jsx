import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../data/products';
import { fmtDateTime } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

const RETURN_META = {
  Requested: { color: '#fab219', icon: Clock },
  Approved: { color: 'var(--accent)', icon: RotateCcw },
  Rejected: { color: '#d03b3b', icon: XCircle },
  Refunded: { color: '#0ca30c', icon: CheckCircle2 },
};

export function ReturnBadge({ status }) {
  const { color, icon: Icon } = RETURN_META[status];
  return (
    <span className="status" style={{ '--status': color }}>
      <Icon size={13} strokeWidth={2} />
      {status}
    </span>
  );
}

export default function Returns() {
  const { returns } = useAdmin();
  const [filter, setFilter] = useState('Requested');
  const list = returns.filter((r) => filter === 'All' || r.status === filter);

  return (
    <>
      <PageHead title="Returns & refunds" />
      <div className="chips">
        {['Requested', 'Approved', 'Refunded', 'Rejected', 'All'].map((s) => (
          <button key={s} className={`chip ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>
            {s}
            <sup>{s === 'All' ? returns.length : returns.filter((r) => r.status === s).length}</sup>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty title={filter === 'Requested' ? 'No returns waiting' : 'Nothing here'}>
          <p className="muted">Customers request returns from their order page within 30 days of delivery.</p>
        </Empty>
      ) : (
        <div className="return-cards">
          {list.map((r) => (
            <ReturnCard key={r.id} ret={r} />
          ))}
        </div>
      )}
    </>
  );
}

function ReturnCard({ ret }) {
  const { decideReturn } = useAdmin();
  const { toast } = useStore();
  const [note, setNote] = useState(ret.adminNote);
  const [busy, setBusy] = useState('');

  const decide = async (status) => {
    if (status === 'Refunded' && !window.confirm(`Refund ${formatPrice(ret.orderTotal)} for ${ret.orderId}? Items go back into stock.`))
      return;
    setBusy(status);
    try {
      await decideReturn(ret.id, status, note);
      toast(`Return for ${ret.orderId} marked ${status.toLowerCase()}`);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy('');
    }
  };

  const actions = { Requested: ['Approved', 'Rejected'], Approved: ['Refunded', 'Rejected'] }[ret.status] ?? [];

  return (
    <article className="panel return-card">
      <header>
        <div>
          <Link to={`/admin/orders/${ret.orderId}`} className="table__link">
            {ret.orderId}
          </Link>
          <span className="muted small"> · {fmtDateTime(ret.date)}</span>
        </div>
        <ReturnBadge status={ret.status} />
      </header>
      <p>
        <Link to={`/admin/customers/${encodeURIComponent(ret.customer.email)}`} className="table__link">
          {ret.customer.name}
        </Link>{' '}
        <span className="muted small">{ret.customer.email}</span>
      </p>
      <p>
        <strong>{ret.reason}</strong>
        {ret.details && <span className="muted"> — “{ret.details}”</span>}
      </p>
      <p className="muted small">
        Order total {formatPrice(ret.orderTotal)}
        {ret.refundAmount != null && ` · refunded ${formatPrice(ret.refundAmount)}`}
      </p>
      {actions.length > 0 ? (
        <>
          <label className="field">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder=" " maxLength={400} />
            <span className="field__label">Note to customer (optional)</span>
          </label>
          <div className="return-card__actions">
            {actions.map((a) => (
              <button
                key={a}
                className={`btn btn--sm ${a === 'Rejected' ? 'btn--ghost' : 'btn--dark'}`}
                onClick={() => decide(a)}
                disabled={!!busy}
              >
                {busy === a ? <span className="spinner" /> : a === 'Approved' ? 'Approve' : a === 'Rejected' ? 'Reject' : 'Mark refunded'}
              </button>
            ))}
          </div>
        </>
      ) : (
        ret.adminNote && <p className="history__note">“{ret.adminNote}”</p>
      )}
    </article>
  );
}
