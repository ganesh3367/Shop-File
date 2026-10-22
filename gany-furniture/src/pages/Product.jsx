import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useScroll, useTransform } from 'framer-motion';
import { Check, ChevronDown, Heart, MapPin, Minus, Plus, RotateCcw, Share2, ShieldCheck, Star, Truck } from 'lucide-react';
import { PRODUCTS, formatPrice, getProduct, sized } from '../data/products';
import { useStore } from '../context/StoreContext';
import ProductCard from '../components/ProductCard';
import { Page, Reveal, ease } from '../components/motion';
import NotFound from './NotFound';

export default function Product() {
  const { id } = useParams();
  const product = getProduct(id);
  if (!product) return <NotFound />;
  // Keyed so all local state resets when navigating between products.
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }) {
  const { addToCart, toggleWishlist, isWished, toast } = useStore();
  const [color, setColor] = useState(product.colors[0].name);
  const [material, setMaterial] = useState(product.materials[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [openAcc, setOpenAcc] = useState(0);
  const [pin, setPin] = useState('');
  const [eta, setEta] = useState(null);
  const ctaRef = useRef(null);
  const wished = isWished(product.id);

  // Sticky mini-bar appears once the main CTA scrolls out of view.
  const { scrollYProgress } = useScroll({ target: ctaRef, offset: ['start start', 'end start'] });
  const [showBar, setShowBar] = useState(false);
  useEffect(() => scrollYProgress.on('change', (v) => setShowBar(v >= 1)), [scrollYProgress]);

  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id)
    .sort((a, b) => Number(b.type === product.type) - Number(a.type === product.type))
    .slice(0, 4);

  const add = () => {
    addToCart(product, { color, material, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const checkPin = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setEta({ ok: false, msg: 'Enter a valid 6-digit PIN code' });
    const local = pin.startsWith('41');
    const date = new Date(Date.now() + (local ? 3 : 7) * 864e5).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    setEta({ ok: true, msg: `${local ? 'Express delivery' : 'Standard delivery'} by ${date}` });
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast('Link copied to clipboard');
      }
    } catch {
      /* user cancelled */
    }
  };

  const accordions = [
    { t: 'The story', body: <p>{product.story}</p> },
    {
      t: 'Dimensions & care',
      body: (
        <ul className="specs">
          <li>
            <span>Dimensions</span>
            {product.dimensions}
          </li>
          <li>
            <span>Material</span>
            {material}
          </li>
          <li>
            <span>Care</span>Dust with a soft dry cloth. Avoid direct sunlight.
          </li>
          <li>
            <span>Assembly</span>Delivered fully assembled
          </li>
        </ul>
      ),
    },
    {
      t: 'Delivery & returns',
      body: (
        <p>
          Free white-glove delivery on orders over ₹50,000. Unused items in their original packaging can be returned within 30 days.{' '}
          <Link to="/returns">Read the full policy →</Link>
        </p>
      ),
    },
  ];

  return (
    <Page className="pdp" label={product.name}>
      <div className="container pdp__grid">
        <div className="pdp__gallery">
          <ZoomImage src={product.image} alt={product.name} />
          <div className="pdp__thumbs">
            {[product.image, ...related.slice(0, 3).map((r) => r.image)].map((src, i) => (
              <motion.div
                key={src}
                className={`pdp__thumb ${i === 0 ? 'is-active' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <img src={sized(src, 200)} alt="" />
                {i > 0 && <span>Styled with</span>}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="pdp__info"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } } }}
        >
          {[
            <p className="eyebrow" key="crumb">
              <Link to="/shop">Shop</Link> / <Link to={`/shop/${product.category}`}>{product.category}</Link> / {product.type}
            </p>,
            <h1 key="title" className="pdp__title">
              {product.name}
            </h1>,
            <div key="rating" className="pdp__rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={15} fill={s <= Math.round(product.rating) ? 'currentColor' : 'none'} />
              ))}
              <span>
                {product.rating} · {product.reviews} reviews
              </span>
            </div>,
            <p key="price" className="pdp__price">
              {formatPrice(product.price)}
              {product.compareAt && (
                <>
                  <s>{formatPrice(product.compareAt)}</s>
                  <span className="tag tag--sale">Save {Math.round((1 - product.price / product.compareAt) * 100)}%</span>
                </>
              )}
            </p>,
            <p key="emi" className="muted small">
              or {formatPrice(Math.ceil(product.price / 6))}/month with 0% EMI for 6 months
            </p>,
            <div key="color" className="option">
              <span className="option__label">
                Colour: <strong>{color}</strong>
              </span>
              <div className="swatches">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    className={`swatch swatch--lg ${color === c.name ? 'is-active' : ''}`}
                    style={{ '--sw': c.hex }}
                    onClick={() => setColor(c.name)}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>,
            <div key="mat" className="option">
              <span className="option__label">Material</span>
              <div className="segmented">
                {product.materials.map((m) => (
                  <button key={m} className={material === m ? 'is-active' : ''} onClick={() => setMaterial(m)}>
                    {material === m && <motion.span layoutId="pdp-mat" className="segmented__bg" />}
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>,
            <div key="cta" className="pdp__cta" ref={ctaRef}>
              <div className="stepper stepper--lg">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  <Minus size={16} />
                </button>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={qty} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
                    {qty}
                  </motion.span>
                </AnimatePresence>
                <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">
                  <Plus size={16} />
                </button>
              </div>
              <AddButton added={added} onClick={add} label={`Add to bag · ${formatPrice(product.price * qty)}`} />
              <motion.button
                className={`icon-btn icon-btn--outline ${wished ? 'is-on' : ''}`}
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleWishlist(product)}
                aria-label="Wishlist"
                aria-pressed={wished}
              >
                <Heart size={18} fill={wished ? 'currentColor' : 'none'} />
              </motion.button>
              <button className="icon-btn icon-btn--outline" onClick={share} aria-label="Share">
                <Share2 size={18} />
              </button>
            </div>,
            <form key="pin" className="pin" onSubmit={checkPin}>
              <MapPin size={16} />
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter PIN code for delivery date"
                inputMode="numeric"
              />
              <button type="submit">Check</button>
            </form>,
            <AnimatePresence key="eta">
              {eta && (
                <motion.p
                  className={`pin__eta ${eta.ok ? 'ok' : 'err'}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {eta.msg}
                </motion.p>
              )}
            </AnimatePresence>,
            <ul key="perks" className="perks">
              <li>
                <Truck size={16} /> Free delivery over ₹50k
              </li>
              <li>
                <RotateCcw size={16} /> 30-day returns
              </li>
              <li>
                <ShieldCheck size={16} /> 10-year warranty
              </li>
            </ul>,
            <div key="acc" className="accordion">
              {accordions.map((a, i) => (
                <div key={a.t} className={`accordion__item ${openAcc === i ? 'is-open' : ''}`}>
                  <button onClick={() => setOpenAcc(openAcc === i ? -1 : i)} aria-expanded={openAcc === i}>
                    {a.t}
                    <motion.span animate={{ rotate: openAcc === i ? 180 : 0 }}>
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openAcc === i && (
                      <motion.div
                        className="accordion__body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                      >
                        <div>{a.body}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>,
          ].map((node, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            >
              {node}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <section className="section container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">You may also like</p>
            <h2 className="display">Complete the room.</h2>
          </div>
          <Link to={`/shop/${product.category}`} className="text-link">
            View all {product.category} →
          </Link>
        </Reveal>
        <div className="grid">
          {related.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {showBar && (
          <motion.div
            className="sticky-bar"
            initial={{ y: '120%' }}
            animate={{ y: 0 }}
            exit={{ y: '120%' }}
            transition={{ duration: 0.5, ease }}
          >
            <img src={sized(product.image, 120)} alt="" />
            <div>
              <strong>{product.name}</strong>
              <span className="muted small">
                {color} · {material}
              </span>
            </div>
            <AddButton added={added} onClick={add} label={formatPrice(product.price * qty)} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

function AddButton({ added, onClick, label, compact }) {
  return (
    <motion.button
      className={`btn btn--accent ${compact ? '' : 'btn--grow'} ${added ? 'is-done' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      disabled={added}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={String(added)}
          className="btn__inner"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {added ? (
            <>
              <Check size={18} /> Added to bag
            </>
          ) : (
            label
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Hover to magnify: the image scales up and pans to follow the pointer. */
function ZoomImage({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  const ox = useMotionValue(50);
  const oy = useMotionValue(50);
  const origin = useTransform([ox, oy], ([x, y]) => `${x}% ${y}%`);

  return (
    <motion.div
      className="zoom"
      onPointerEnter={() => setZoom(true)}
      onPointerLeave={() => setZoom(false)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ox.set(((e.clientX - r.left) / r.width) * 100);
        oy.set(((e.clientY - r.top) / r.height) * 100);
      }}
      initial={{ clipPath: 'inset(10% 10% 10% 10% round 24px)', opacity: 0 }}
      animate={{ clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1 }}
      transition={{ duration: 1.1, ease, delay: 0.2 }}
    >
      <motion.img
        src={sized(src, 1600)}
        alt={alt}
        style={{ transformOrigin: origin }}
        animate={{ scale: zoom ? 1.8 : 1 }}
        transition={{ duration: 0.5, ease }}
      />
    </motion.div>
  );
}
