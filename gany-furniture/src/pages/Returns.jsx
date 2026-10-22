import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Page, Reveal, SplitText } from '../components/motion';

const SECTIONS = [
  {
    id: 'eligibility',
    t: 'Eligibility for returns',
    body: (
      <ul className="ticks">
        <li>Items must be unused and in their original condition with all tags attached.</li>
        <li>Return items in their original packaging.</li>
        <li>Start your return within 30 days of delivery.</li>
      </ul>
    ),
  },
  {
    id: 'non-returnable',
    t: 'Non-returnable items',
    body: (
      <ul className="crosses">
        <li>Customised or made-to-order furniture.</li>
        <li>Clearance or final-sale items.</li>
        <li>Products damaged by misuse or accidents after delivery.</li>
      </ul>
    ),
  },
  {
    id: 'how',
    t: 'How to start a return',
    body: (
      <ol className="numbered">
        <li>
          <strong>Contact us.</strong> Email support@ganysfurniture.com with your order details.
        </li>
        <li>
          <strong>Approval.</strong> Once your return is approved, we'll send instructions for sending the item back.
        </li>
        <li>
          <strong>Return shipping.</strong> You pay return shipping unless the item arrived damaged or defective.
        </li>
      </ol>
    ),
  },
  {
    id: 'damaged',
    t: 'Damaged or defective items',
    body: (
      <p>
        If your item arrives damaged or defective, let us know within 7 days of delivery. Once we've checked the issue, we'll arrange a
        replacement or a full refund, including shipping costs.
      </p>
    ),
  },
  {
    id: 'refunds',
    t: 'Refund process',
    body: (
      <p>
        Refunds go back to your original payment method within 7–10 business days after we receive and inspect the returned item. Any
        shipping fees or restocking charges are deducted from the refund.
      </p>
    ),
  },
  {
    id: 'exchanges',
    t: 'Exchanges',
    body: <p>To exchange an item, contact our team. Exchanges depend on product availability.</p>,
  },
];

export default function Returns() {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Scroll-spy: highlight the TOC entry for whichever section is in view.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-40% 0px -55% 0px',
    });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -120 });
    else el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Page className="returns" label="Returns">
      <header className="container page-hero">
        <p className="eyebrow">Return policy</p>
        <SplitText as="h1" className="mega" text="Love it, or return it." delay={0.3} />
        <Reveal delay={0.5}>
          <p className="lead narrow">Your happiness comes first. If you don't love your purchase, we'll help put it right.</p>
        </Reveal>
      </header>

      <section className="container returns__grid">
        <nav className="toc" aria-label="On this page">
          {SECTIONS.map((s) => (
            <button key={s.id} className={active === s.id ? 'is-active' : ''} onClick={() => jump(s.id)}>
              {active === s.id && <motion.span layoutId="toc-dot" className="toc__dot" />}
              {s.t}
            </button>
          ))}
        </nav>
        <div className="prose">
          {SECTIONS.map((s, i) => (
            <Reveal as="section" key={s.id} id={s.id}>
              <span className="prose__num">0{i + 1}</span>
              <h2>{s.t}</h2>
              {s.body}
            </Reveal>
          ))}
          <Reveal className="card-soft card-soft--accent">
            <h3>Need help with a return?</h3>
            <p>
              📧 support@ganysfurniture.com · 📞 +91 83297 93246
              <br />
              Thank you for choosing Gany's Furniture. We want shopping with us to be easy.
            </p>
            <Link to="/contact" className="btn btn--dark">
              Start a return
            </Link>
          </Reveal>
        </div>
      </section>
    </Page>
  );
}
