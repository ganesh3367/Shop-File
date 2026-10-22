import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUpRight, Leaf, Plus, Ruler, ShieldCheck, Truck } from 'lucide-react';
import { CATEGORIES, PRODUCTS, formatPrice, getProduct, sized } from '../data/products';
import { useStore } from '../context/StoreContext';
import ProductCard from '../components/ProductCard';
import { Counter, ImageReveal, Magnetic, Page, Reveal, SplitText, ease } from '../components/motion';

export default function Home({ ready }) {
  return (
    <Page className="home">
      <Hero ready={ready} />
      <Intro />
      <Categories />
      <HorizontalShowcase />
      <ShopTheRoom />
      <Story />
      <Bestsellers />
      <Promise />
      <Testimonials />
      <CTA />
    </Page>
  );
}

/* ---------- Hero: full-bleed video that shrinks into a card as you scroll ---------- */
function Hero({ ready }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const inset = useTransform(scrollYProgress, [0, 1], [0, 7]);
  const radius = useTransform(scrollYProgress, [0, 1], [0, 32]);
  const clip = useMotionTemplate`inset(${inset}% ${inset}% ${inset}% ${inset}% round ${radius}px)`;
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  // Text drifts up and fades early so it never slides into the meta row below it.
  const textY = useTransform(scrollYProgress, [0, 0.5], ['0%', '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const metaFade = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__media" style={{ clipPath: clip }}>
        <motion.video style={{ scale: videoScale }} autoPlay muted loop playsInline poster="/media/banner.webp">
          <source src="/media/hero.mp4" type="video/mp4" />
        </motion.video>
        <div className="hero__shade" />
      </motion.div>

      <motion.div className="hero__content container" style={{ y: textY, opacity: fade }}>
        <motion.p
          className="eyebrow eyebrow--light"
          initial={{ opacity: 0, y: 20 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Spring / Summer 2026 Collection
        </motion.p>
        <SplitText as="h1" className="hero__title" text="Crafted for comfort." trigger={ready} delay={0.3} />
        <SplitText as="h1" className="hero__title hero__title--italic" text="Designed to inspire." trigger={ready} delay={0.55} />
        <motion.div
          className="hero__row"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1, delay: 1.1, ease }}
        >
          <p>Premium furniture that turns a house into a home. Handcrafted in Pune and made to last for generations.</p>
          <div className="hero__ctas">
            <Magnetic>
              <Link to="/shop" className="btn btn--light">
                Shop the collection <ArrowRight size={18} />
              </Link>
            </Magnetic>
            <Link to="/about" className="btn btn--ghost-light">
              Our story
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero__meta"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ delay: 1.6 }}
        style={{ opacity: metaFade }}
      >
        <span>Now showing: Eave Modular Sofa</span>
        <span className="hero__scroll">
          Scroll
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ArrowDown size={14} />
          </motion.span>
        </span>
      </motion.div>
    </section>
  );
}

/* ---------- Intro + counters ---------- */
function Intro() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section className="intro container section" ref={ref}>
      <div className="intro__text">
        <p className="eyebrow">Welcome to Gany's Furniture</p>
        <SplitText className="display" text="Furniture that turns your house into a home, built to look good and last." stagger={0.03} />
        <Reveal delay={0.2}>
          <p className="lead">
            We make premium furniture that brings together style, comfort and durability. From elegant sofas and cosy lounge chairs to
            dining sets and modern work tables, everything is made for spaces you'll love living in.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <Link to="/about" className="text-link">
            Meet the makers <ArrowUpRight size={16} />
          </Link>
        </Reveal>
      </div>
      <div className="intro__visual">
        <motion.div style={{ y }} className="intro__img">
          <ImageReveal src="/media/studio.jpg" alt="Inside the Gany's Furniture studio" />
        </motion.div>
        <motion.div
          className="intro__badge"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
          aria-hidden
        >
          <svg viewBox="0 0 100 100">
            <defs>
              <path id="circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
            </defs>
            <text>
              <textPath href="#circle">handcrafted · in · pune · since · 2024 ·</textPath>
            </text>
          </svg>
        </motion.div>
      </div>
      <div className="stats">
        {[
          { n: 1200, s: '+', l: 'Homes furnished' },
          { n: PRODUCTS.length, s: '', l: 'Signature pieces' },
          { n: 48, s: '', l: 'Artisans & makers' },
          { n: 10, s: ' yr', l: 'Frame warranty' },
        ].map((st, i) => (
          <Reveal key={st.l} delay={i * 0.1} className="stat">
            <strong>
              <Counter to={st.n} suffix={st.s} />
            </strong>
            <span>{st.l}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Category accordion: hovered panel expands ---------- */
function Categories() {
  const [active, setActive] = useState(0);
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Shop by category</p>
          <SplitText className="display" text="Three rooms of thought." />
        </div>
        <Link to="/shop" className="text-link">
          Browse everything <ArrowRight size={16} />
        </Link>
      </div>
      <div className="cats">
        {CATEGORIES.map((c, i) => {
          const count = PRODUCTS.filter((p) => p.category === c.slug).length;
          return (
            <motion.div
              key={c.slug}
              className={`cat ${active === i ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(i)}
              layout
              transition={{ duration: 0.7, ease }}
            >
              <Link to={`/shop/${c.slug}`}>
                <motion.img
                  src={sized(c.cover, 1400)}
                  alt={c.name}
                  loading="lazy"
                  animate={{ scale: active === i ? 1.05 : 1.2 }}
                  transition={{ duration: 1.2, ease }}
                />
                <div className="cat__shade" />
                <div className="cat__info">
                  <span className="cat__num">0{i + 1}</span>
                  <h3>{c.name}</h3>
                  <AnimatePresence>
                    {active === i && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <p>{c.tagline}</p>
                        <span className="pill">{count} pieces →</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Pinned horizontal scroll ---------- */
function HorizontalShowcase() {
  const target = useRef(null);
  const track = useRef(null);
  const [distance, setDistance] = useState(0);
  const items = PRODUCTS.filter((p) => p.featured).slice(0, 8);

  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="hscroll" ref={target} style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="hscroll__sticky">
        <div className="container hscroll__head">
          <div>
            <p className="eyebrow">Editor's selection</p>
            <h2 className="display">Pieces we can't stop sitting in.</h2>
          </div>
          <div className="hscroll__bar">
            <motion.span style={{ scaleX: bar }} />
          </div>
        </div>
        <motion.div className="hscroll__track" ref={track} style={{ x }}>
          {items.map((p, i) => (
            <Link to={`/product/${p.id}`} className="hcard" key={p.id}>
              <div className="hcard__img">
                <img src={sized(p.image, 900)} alt={p.name} loading="lazy" />
              </div>
              <div className="hcard__meta">
                <span className="muted">{String(i + 1).padStart(2, '0')}</span>
                <h4>{p.name}</h4>
                <span>{formatPrice(p.price)}</span>
              </div>
            </Link>
          ))}
          <Link to="/shop" className="hcard hcard--more">
            <span>
              See all
              <br />
              {PRODUCTS.length} pieces
            </span>
            <ArrowUpRight size={40} strokeWidth={1} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Shoppable image with pulsing hotspots ---------- */
const ROOMS = [
  {
    name: 'The Living Room',
    image: '/media/banner.webp',
    spots: [
      { id: 'luxe-loveseat', x: 50, y: 50 },
      { id: 'brasilia-lounge', x: 12, y: 58 },
      { id: 'marble-table', x: 50, y: 74 },
      { id: 'cozy-armchair', x: 87, y: 56 },
      { id: 'androgyne-side', x: 74, y: 48 },
    ],
  },
  {
    name: 'The Dining Room',
    image: '/media/dining.jpeg',
    portrait: true,
    spots: [
      { id: 'tubulaire-chandelier', x: 51, y: 25 },
      { id: 'timber-tales', x: 40, y: 66 },
      { id: 'merkur-chair', x: 72, y: 76 },
      { id: 'afteroom-plus', x: 20, y: 80 },
    ],
  },
];

function ShopTheRoom() {
  const [room, setRoom] = useState(0);
  const [open, setOpen] = useState(null);
  const { addToCart, toast } = useStore();
  const r = ROOMS[room];
  const roomProducts = r.spots.map((s) => getProduct(s.id));
  const total = roomProducts.reduce((s, p) => s + p.price, 0);

  return (
    <section className="section container room">
      <div className="section-head">
        <div>
          <p className="eyebrow">Shop the look</p>
          <SplitText className="display" text="Tap a dot, take it home." />
        </div>
        <div className="segmented segmented--lg">
          {ROOMS.map((rm, i) => (
            <button
              key={rm.name}
              className={room === i ? 'is-active' : ''}
              onClick={() => {
                setRoom(i);
                setOpen(null);
              }}
            >
              {room === i && <motion.span layoutId="room-tab" className="segmented__bg" />}
              <span>{rm.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`room__grid ${r.portrait ? 'is-portrait' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={r.name}
            className="room__stage"
            initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0 0%)' }}
            exit={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
            transition={{ duration: 0.9, ease }}
            onClick={() => setOpen(null)}
          >
            <img src={r.image} alt={r.name} />
            {r.spots.map((s, i) => {
              const p = getProduct(s.id);
              const isOpen = open === i;
              return (
                <div key={s.id} className="spot" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                  <motion.button
                    className={`spot__dot ${isOpen ? 'is-open' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(isOpen ? null : i);
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: isOpen ? 45 : 0 }}
                    transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                    aria-label={`Show ${p.name}`}
                  >
                    <Plus size={14} />
                  </motion.button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        className={`spot__card ${s.x > 60 ? 'is-left' : ''} ${s.y > 60 ? 'is-up' : ''}`}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src={sized(p.image, 200)} alt="" />
                        <div>
                          <Link to={`/product/${p.id}`}>
                            <strong>{p.name}</strong>
                          </Link>
                          <span>{formatPrice(p.price)}</span>
                          <button className="link-btn" onClick={() => addToCart(p)}>
                            Add to bag +
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <div className="room__list">
          <h3>{r.name}</h3>
          <ul>
            {roomProducts.map((p, i) => (
              <motion.li
                key={p.id}
                className={open === i ? 'is-active' : ''}
                onPointerEnter={() => setOpen(i)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <span className="room__idx">{i + 1}</span>
                <Link to={`/product/${p.id}`}>{p.name}</Link>
                <span>{formatPrice(p.price)}</span>
              </motion.li>
            ))}
          </ul>
          <div className="room__total">
            <span>Complete the look</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <button
            className="btn btn--dark btn--block"
            onClick={() => {
              roomProducts.forEach((p) => addToCart(p, { silent: true }));
              toast(`${roomProducts.length} pieces from ${r.name} added to your bag`, { image: r.image, action: 'cart' });
            }}
          >
            Add whole room to bag
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Editorial story (from the original "Resonant Pendant" section) ---------- */
function Story() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  const quoteX = useTransform(scrollYProgress, [0, 1], ['10%', '-30%']);

  return (
    <section className="story" ref={ref}>
      <motion.p className="story__ghost" style={{ x: quoteX }} aria-hidden>
        Resonant · Resonant · Resonant
      </motion.p>
      <div className="container story__grid">
        <div className="story__img">
          <motion.img
            style={{ y: imgY }}
            src={sized(
              'https://audocph.com/cdn/shop/files/Audo_Tearoom_Club_Chair_Swivel_Androgyne_Side_Table_Reverse_Table_Lamp_Portable_1_39aba02d-0d63-4424-89d9-2b2b39088ff4.jpg?v=1740475092',
              1400,
            )}
            alt="Tearoom club chair beside a Resonant pendant"
            loading="lazy"
          />
        </div>
        <div className="story__text">
          <p className="eyebrow">Design story · No. 07</p>
          <SplitText className="display" text="The Resonant Pendant." />
          <Reveal>
            <p className="lead">Designed in the 1950s by Alf Svensson and Yngvar Sandström, Resonant still feels right today.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="muted">
              The mid-century pendant is striking and simple: polished brass shaped into four concentric shades that send glare-free light
              downwards. Its name points to the play between light and sound, as light bounces off the shiny surface and spreads across the
              room.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link to="/shop/lighting" className="btn btn--dark">
              Explore lighting <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Tabbed bestseller grid with layout animation ---------- */
function Bestsellers() {
  const [tab, setTab] = useState('seating');
  const items = PRODUCTS.filter((p) => p.category === tab).slice(0, 4);
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Bestsellers</p>
          <SplitText className="display" text="Loved in a thousand homes." />
        </div>
        <div className="segmented segmented--lg">
          {CATEGORIES.map((c) => (
            <button key={c.slug} className={tab === c.slug ? 'is-active' : ''} onClick={() => setTab(c.slug)}>
              {tab === c.slug && <motion.span layoutId="best-tab" className="segmented__bg" />}
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      <motion.div className="grid" layout>
        <AnimatePresence mode="popLayout">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function Promise() {
  const items = [
    { icon: Truck, t: 'White-glove delivery', d: 'Free over ₹50,000. Assembled and placed in your room.' },
    { icon: ShieldCheck, t: '10-year warranty', d: 'Every frame we build is guaranteed for a decade.' },
    { icon: Ruler, t: 'Made to measure', d: 'Custom sizes and fabrics, made in our Pune workshop.' },
    { icon: Leaf, t: 'Responsibly sourced', d: 'FSC-certified timber and low-VOC natural finishes.' },
  ];
  return (
    <section className="promise">
      <div className="container promise__grid">
        {items.map(({ icon: Icon, t, d }, i) => (
          <Reveal key={t} delay={i * 0.08} className="promise__item">
            <Icon size={26} strokeWidth={1.4} />
            <h4>{t}</h4>
            <p>{d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const REVIEWS = [
  {
    q: 'The bouclé loveseat is even softer than it looks. Delivery guys set it up and took all the packaging away.',
    n: 'Ananya R.',
    c: 'Koregaon Park, Pune',
  },
  {
    q: 'Our dining table is now the centre of every family dinner. The grain on the oak is just beautiful.',
    n: 'Rohit & Meera',
    c: 'Baner, Pune',
  },
  { q: "I got the Hashira lamp for my reading corner and now I don't want to leave it.", n: 'Kabir S.', c: 'Mumbai' },
  { q: 'They customised a sofa to fit our odd-shaped living room. It fits perfectly.', n: 'Priya D.', c: 'Hinjewadi, Pune' },
  { q: 'Lovely quality and service. The team followed up a month later to check everything was fine.', n: 'Vikram J.', c: 'Bengaluru' },
];

function Testimonials() {
  const wrap = useRef(null);
  return (
    <section className="section testimonials">
      <div className="container section-head">
        <div>
          <p className="eyebrow">Kind words</p>
          <h2 className="display">Rated 4.8 by 1,200+ homes.</h2>
        </div>
        <p className="muted small">← Drag to explore →</p>
      </div>
      <div className="testimonials__viewport" ref={wrap}>
        <motion.div className="testimonials__track" drag="x" dragConstraints={wrap} dragElastic={0.12}>
          {REVIEWS.map((r, i) => (
            <motion.figure
              key={r.n}
              className="quote"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.8, ease }}
            >
              <div className="quote__stars">★★★★★</div>
              <blockquote>“{r.q}”</blockquote>
              <figcaption>
                <span className="avatar">{r.n[0]}</span>
                <span>
                  <strong>{r.n}</strong>
                  <small>{r.c}</small>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="cta container">
      <motion.div
        className="cta__card"
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 1, ease }}
      >
        <img src="/media/standing-lamp.jpeg" alt="" aria-hidden className="cta__bg" loading="lazy" />
        <div className="cta__content">
          <SplitText className="display" text="Visit our Pune studio." />
          <p>See the materials, sit on the sofas and get free interior advice from our team.</p>
          <Magnetic>
            <Link to="/contact" className="btn btn--light">
              Book a visit <ArrowUpRight size={18} />
            </Link>
          </Magnetic>
        </div>
      </motion.div>
    </section>
  );
}
