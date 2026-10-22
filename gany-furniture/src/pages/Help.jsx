import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, CreditCard, Package, RotateCcw, Ruler, Search } from 'lucide-react';
import { Page, Reveal, SplitText, ease } from '../components/motion';

const TOPICS = [
  { id: 'orders', label: 'Orders & delivery', icon: Package },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'products', label: 'Products & care', icon: Ruler },
];

const FAQ = [
  {
    topic: 'orders',
    q: 'How long does delivery take?',
    a: 'Ground delivery takes 5–7 business days, Air 2–3 days, and Express arrives next day in Pune and Mumbai. Made-to-order pieces take 3–5 weeks.',
  },
  {
    topic: 'orders',
    q: 'Is delivery free?',
    a: 'Yes. Ground delivery is free on orders over ₹50,000, including white-glove assembly and packaging removal.',
  },
  {
    topic: 'orders',
    q: 'Can I track my order?',
    a: "Once your order is dispatched we'll send you an SMS and email with live tracking. Our team will also call to book a delivery slot.",
  },
  {
    topic: 'returns',
    q: 'What is your return window?',
    a: 'You can start a return within 30 days of delivery. Items must be unused, in their original condition and packaging.',
  },
  {
    topic: 'returns',
    q: 'Which items cannot be returned?',
    a: 'Customised or made-to-order furniture, clearance or final-sale items, and products damaged by misuse after delivery.',
  },
  {
    topic: 'returns',
    q: 'My item arrived damaged. What now?',
    a: "Let us know within 7 days. After a quick check we'll arrange a replacement or a full refund, including shipping costs.",
  },
  {
    topic: 'payments',
    q: 'Which payment methods do you accept?',
    a: 'UPI, all major credit and debit cards, net banking and pay-on-delivery for orders under ₹1,00,000.',
  },
  { topic: 'payments', q: 'Do you offer EMI?', a: 'Yes. 0% EMI for 6 months is available on most cards for orders over ₹10,000.' },
  {
    topic: 'payments',
    q: 'When will I get my refund?',
    a: 'Refunds go back to your original payment method within 7–10 business days after we receive and inspect the item.',
  },
  {
    topic: 'products',
    q: 'Can I customise size or fabric?',
    a: 'Most seating and tables can be made to measure. Pick "Custom order" on our contact form and our designers will get in touch.',
  },
  {
    topic: 'products',
    q: 'How do I care for bouclé?',
    a: 'Vacuum gently with a soft brush attachment. Blot spills straight away with a damp cloth and avoid rubbing.',
  },
  {
    topic: 'products',
    q: 'What warranty do you offer?',
    a: 'Every frame comes with a 10-year warranty. Upholstery and mechanisms are covered for 2 years.',
  },
];

export default function Help() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState(null);
  const [open, setOpen] = useState(null);

  const list = useMemo(() => {
    const query = q.toLowerCase().trim();
    return FAQ.filter((f) => (!topic || f.topic === topic) && (!query || `${f.q} ${f.a}`.toLowerCase().includes(query)));
  }, [q, topic]);

  const highlight = (text) => {
    if (!q.trim()) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase().trim());
    if (i < 0) return text;
    const len = q.trim().length;
    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + len)}</mark>
        {text.slice(i + len)}
      </>
    );
  };

  return (
    <Page className="help" label="Help centre">
      <header className="container page-hero page-hero--center">
        <p className="eyebrow">Help centre</p>
        <SplitText as="h1" className="mega" text="How can we help?" delay={0.3} />
        <motion.label
          className="help__search"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, ease }}
        >
          <Search size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search delivery, returns, EMI…" />
        </motion.label>
      </header>

      <section className="container">
        <div className="topic-grid">
          {TOPICS.map(({ id, label, icon: Icon }, i) => (
            <Reveal key={id} delay={i * 0.06}>
              <button className={`topic ${topic === id ? 'is-active' : ''}`} onClick={() => setTopic(topic === id ? null : id)}>
                <Icon size={24} strokeWidth={1.4} />
                <span>{label}</span>
                <small className="muted">{FAQ.filter((f) => f.topic === id).length} articles</small>
              </button>
            </Reveal>
          ))}
        </div>

        <motion.div className="faq" layout>
          <AnimatePresence mode="popLayout">
            {list.map((f) => (
              <motion.div
                key={f.q}
                layout
                className={`accordion__item ${open === f.q ? 'is-open' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <button onClick={() => setOpen(open === f.q ? null : f.q)} aria-expanded={open === f.q}>
                  {highlight(f.q)}
                  <motion.span animate={{ rotate: open === f.q ? 180 : 0 }}>
                    <ChevronDown size={18} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === f.q && (
                    <motion.div
                      className="accordion__body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <div>
                        <p>{highlight(f.a)}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          {list.length === 0 && (
            <p className="muted center">
              No answers for “{q}”. <Link to="/contact">Ask us directly →</Link>
            </p>
          )}
        </motion.div>

        <Reveal className="help__cta">
          <h3>Still need help?</h3>
          <p className="muted">Our team replies within one business day.</p>
          <Link to="/contact" className="btn btn--dark">
            Contact support
          </Link>
        </Reveal>
      </section>
    </Page>
  );
}
