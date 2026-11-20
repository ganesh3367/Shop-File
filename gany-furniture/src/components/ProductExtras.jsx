import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Box, Camera, Check, ImagePlus, Plus, Star, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCatalog } from '../context/CatalogContext';
import { api } from '../lib/api';
import { formatPrice, sized } from '../data/products';
import { Reveal, ease } from './motion';

/* ------------------------------------------------------------------------- */
/* 3D / AR viewer                                                             */
/* ------------------------------------------------------------------------- */

/**
 * Google's <model-viewer> is ~1 MB, so it's only downloaded when a shopper opens the 3D view.
 * On phones that support it, the AR button places the piece in the room through the camera.
 */
export function ModelViewer3D({ src, alt, credit, poster }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    import('@google/model-viewer').then(() => setReady(true));
  }, []);

  return (
    <div className="model3d">
      {ready ? (
        <model-viewer
          src={src}
          alt={alt}
          poster={poster}
          camera-controls
          auto-rotate
          auto-rotate-delay="1500"
          rotation-per-second="18deg"
          shadow-intensity="1"
          exposure="1"
          environment-image="neutral"
          ar
          ar-modes="webxr scene-viewer quick-look"
          touch-action="pan-y"
          interaction-prompt="auto"
        >
          <button slot="ar-button" className="model3d__ar">
            <Camera size={16} /> View in your room
          </button>
        </model-viewer>
      ) : (
        <div className="model3d__loading">
          <span className="spinner" />
        </div>
      )}
      <p className="model3d__note">
        <Box size={13} /> Drag to rotate · scroll to zoom. Representative 3D model{credit ? ` — ${credit}` : ''}.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Frequently bought together                                                 */
/* ------------------------------------------------------------------------- */
export function Together({ product, ids }) {
  const { getProduct } = useCatalog();
  const { addToCart, toast } = useStore();
  const others = ids.map(getProduct).filter((p) => p && p.stock > 0);
  const [picked, setPicked] = useState(() => new Set(others.map((p) => p.id)));
  if (others.length === 0) return null;

  const bundle = [product, ...others.filter((p) => picked.has(p.id))];
  const total = bundle.reduce((s, p) => s + p.price, 0);

  const addAll = () => {
    bundle.forEach((p) => addToCart(p, { silent: true }));
    toast(`${bundle.length} pieces added to your bag`, { image: product.image, action: 'cart' });
  };

  return (
    <section className="container together">
      <Reveal>
        <p className="eyebrow">Frequently bought together</p>
        <h2 className="display">Pairs well with.</h2>
      </Reveal>
      <div className="together__row">
        <div className="together__items">
          {[product, ...others].map((p, i) => {
            const on = i === 0 || picked.has(p.id);
            return (
              <div key={p.id} className="together__cell">
                {i > 0 && <Plus size={18} className="together__plus" />}
                <label className={`together__item ${on ? 'is-on' : ''}`}>
                  <img src={sized(p.image, 300)} alt="" />
                  {i > 0 && (
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((s) => {
                          const n = new Set(s);
                          n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                          return n;
                        })
                      }
                      aria-label={`Include ${p.name}`}
                    />
                  )}
                  <span className="together__check">{on && <Check size={12} />}</span>
                  <span className="together__name">{i === 0 ? `This item: ${p.name}` : <Link to={`/product/${p.id}`}>{p.name}</Link>}</span>
                  <strong>{formatPrice(p.price)}</strong>
                </label>
              </div>
            );
          })}
        </div>
        <div className="together__buy">
          <span className="muted small">Total for {bundle.length}</span>
          <strong>{formatPrice(total)}</strong>
          <button className="btn btn--dark" onClick={addAll}>
            Add {bundle.length === 1 ? 'it' : `all ${bundle.length}`} to bag
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* ------------------------------------------------------------------------- */
function Stars({ value, size = 15 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={s <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export function Reviews({ product, reviews, onSubmitted }) {
  const { user } = useStore();
  const [writing, setWriting] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const location = useLocation();
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <section className="container section reviews" id="reviews">
      <div className="reviews__grid">
        <aside className="reviews__summary">
          <p className="eyebrow">Reviews</p>
          <div className="reviews__score">
            <strong>{product.rating ? product.rating.toFixed(1) : '–'}</strong>
            <div>
              <Stars value={product.rating} size={18} />
              <span className="muted small">{product.reviews} ratings</span>
            </div>
          </div>
          {reviews.length > 0 && (
            <ul className="reviews__bars" aria-label="Ratings from written reviews">
              {counts.map(({ n, c }) => (
                <li key={n}>
                  <span>{n}★</span>
                  <span className="reviews__bar">
                    <span style={{ width: `${(c / reviews.length) * 100}%` }} />
                  </span>
                  <span className="muted small">{c}</span>
                </li>
              ))}
            </ul>
          )}
          {user ? (
            <button className="btn btn--dark btn--block" onClick={() => setWriting(true)}>
              Write a review
            </button>
          ) : (
            <Link to="/login" state={{ from: location.pathname }} className="btn btn--ghost btn--block">
              Log in to write a review
            </Link>
          )}
        </aside>

        <div className="reviews__list">
          {reviews.length === 0 ? (
            <p className="muted">No written reviews yet. Bought this piece? Tell others what you think.</p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="review-item">
                <header>
                  <Stars value={r.rating} />
                  <h4>{r.title}</h4>
                </header>
                <p>{r.body}</p>
                {r.photo && (
                  <button className="review__photo" onClick={() => setLightbox(r.photo)} aria-label="Open photo">
                    <img src={r.photo} alt={`Photo from ${r.name}`} loading="lazy" />
                  </button>
                )}
                <footer className="muted small">
                  {r.name}
                  {r.verified && (
                    <span className="review__verified">
                      <BadgeCheck size={14} /> Verified buyer
                    </span>
                  )}
                  · {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </footer>
              </article>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {writing && <ReviewForm product={product} onClose={() => setWriting(false)} onSubmitted={onSubmitted} />}
      </AnimatePresence>
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="modal-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.img src={lightbox} alt="" className="lightbox" initial={{ scale: 0.9 }} animate={{ scale: 1 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ReviewForm({ product, onClose, onSubmitted }) {
  const { token, toast } = useStore();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setError('Photo must be a JPG, PNG or WebP image');
    if (f.size > 4 * 1024 * 1024) return setError('Photo must be 4 MB or smaller');
    setError('');
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Choose a star rating');
    const form = new FormData();
    form.append('rating', String(rating));
    form.append('title', title);
    form.append('body', body);
    if (photo) form.append('photo', photo);
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not send your review');
      toast('Thanks! Your review will appear once it’s approved.');
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="modal review-form"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.4, ease }}
        data-lenis-prevent
        noValidate
      >
        <button type="button" className="icon-btn modal__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <p className="eyebrow">Review</p>
        <h3>{product.name}</h3>
        <div className="star-picker" onPointerLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onPointerEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className={(hover || rating) >= n ? 'is-on' : ''}
            >
              <Star size={30} fill="currentColor" />
            </button>
          ))}
        </div>
        <label className="field">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder=" " maxLength={80} />
          <span className="field__label">Title</span>
        </label>
        <label className="field">
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder=" " maxLength={1000} />
          <span className="field__label">What did you like or dislike?</span>
        </label>
        <div className="review-form__photo">
          {preview ? (
            <div className="review-form__preview">
              <img src={preview} alt="Selected" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setPhoto(null);
                  setPreview('');
                }}
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} /> Add a photo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn--accent btn--block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Submit review'}
        </button>
        <p className="muted small center">Reviews are checked by our team before they appear.</p>
      </motion.form>
    </motion.div>
  );
}
