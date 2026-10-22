import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUp, Instagram, Twitter } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { Magnetic } from './motion';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      ['All products', '/shop'],
      ['Seating', '/shop/seating'],
      ['Tables', '/shop/tables'],
      ['Lighting', '/shop/lighting'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Our story', '/about'],
      ['Careers', '/careers'],
      ['Contact', '/contact'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Help centre', '/help'],
      ['Shipping', '/checkout'],
      ['Returns', '/returns'],
    ],
  },
];

export default function Footer() {
  const { toast } = useStore();
  const [email, setEmail] = useState('');

  const subscribe = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Please enter a valid email address');
    api('/subscribers', { method: 'POST', body: { email } })
      .then(() => {
        toast('Welcome to the studio list ✺');
        setEmail('');
      })
      .catch((err) => toast(err.message));
  };

  const toTop = () => (window.__lenis ? window.__lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }));

  return (
    <footer className="footer">
      <div className="footer__top container">
        <div className="footer__news">
          <h2>Stay close to the studio.</h2>
          <p>New collections, workshop stories and private sale invites. No spam, ever.</p>
          <form onSubmit={subscribe} className="footer__form">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button type="submit" aria-label="Subscribe">
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <div className="footer__cols">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h3>{c.title}</h3>
              <ul>
                {c.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="link-roll">
                      <span className="link-roll__mask">
                        <span className="link-roll__text" data-text={label}>
                          {label}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3>Follow</h3>
            <div className="footer__social">
              <a href="https://www.instagram.com/ganesh_3367_/?hl=en" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
                <Twitter size={18} />
              </a>
              <a href="https://new-portfolio-delta-five.vercel.app/" target="_blank" rel="noreferrer" className="pill-link">
                Partnerships
              </a>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="footer__mega"
        initial={{ y: '40%', opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        Gany's
      </motion.div>

      <div className="footer__bottom container">
        <p>© {new Date().getFullYear()} Gany's Furniture Pvt. Ltd. · Pune, India</p>
        <Magnetic>
          <button className="footer__top-btn" onClick={toTop} aria-label="Back to top">
            <ArrowUp size={18} />
          </button>
        </Magnetic>
      </div>
    </footer>
  );
}
