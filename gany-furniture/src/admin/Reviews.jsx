import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, ExternalLink, Star, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { sized } from '../data/products';
import { fmtDateTime } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

export default function Reviews() {
  const { reviews, setReviewStatus, deleteReview } = useAdmin();
  const { toast } = useStore();
  const [filter, setFilter] = useState('Pending');
  const list = reviews.filter((r) => filter === 'All' || r.status === filter);

  const act = async (fn, msg) => {
    try {
      await fn();
      toast(msg);
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <PageHead title="Reviews" />
      <div className="chips">
        {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
          <button key={s} className={`chip ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>
            {s}
            <sup>{s === 'All' ? reviews.length : reviews.filter((r) => r.status === s).length}</sup>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty title={filter === 'Pending' ? 'All caught up' : 'Nothing here'}>
          <p className="muted">Customer reviews wait here until you approve them for the shop.</p>
        </Empty>
      ) : (
        <div className="review-cards">
          {list.map((r) => (
            <article key={r.id} className="panel review-card">
              <header>
                <img src={sized(r.product.image, 120)} alt="" />
                <div>
                  <Link to={`/product/${r.productId}`} target="_blank" className="table__link">
                    {r.product.name} <ExternalLink size={12} />
                  </Link>
                  <span className="muted small">{fmtDateTime(r.date)}</span>
                </div>
                <span className={`pill-mini ${r.status === 'Approved' ? 'pill-mini--ok' : ''}`}>{r.status}</span>
              </header>
              <div className="stars" role="img" aria-label={`${r.rating} stars`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={15} fill={n <= r.rating ? 'currentColor' : 'none'} />
                ))}
              </div>
              <h4>{r.title}</h4>
              <p>{r.body}</p>
              {r.photo && (
                <a href={r.photo} target="_blank" rel="noreferrer" className="review-card__photo">
                  <img src={r.photo} alt="Customer photo" />
                </a>
              )}
              <p className="muted small review-card__by">
                {r.name}
                {r.verified && (
                  <span className="review__verified">
                    <BadgeCheck size={13} /> Verified buyer
                  </span>
                )}
              </p>
              <div className="return-card__actions">
                {r.status !== 'Approved' && (
                  <button
                    className="btn btn--dark btn--sm"
                    onClick={() => act(() => setReviewStatus(r.id, 'Approved'), 'Review approved — now live on the product page')}
                  >
                    <Check size={15} /> Approve
                  </button>
                )}
                {r.status !== 'Rejected' && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => act(() => setReviewStatus(r.id, 'Rejected'), 'Review rejected')}
                  >
                    <X size={15} /> Reject
                  </button>
                )}
                <button
                  className="icon-btn"
                  onClick={() => window.confirm('Delete this review permanently?') && act(() => deleteReview(r.id), 'Review deleted')}
                  aria-label="Delete review"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
