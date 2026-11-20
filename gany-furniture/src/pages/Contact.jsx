import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { Page, Reveal, SplitText, ease } from '../components/motion';

const INFO = [
  { icon: MapPin, t: 'Studio', v: 'Pune, Maharashtra, India' },
  { icon: Phone, t: 'Phone', v: '+91 83297 93246', href: 'tel:+918329793246' },
  { icon: Mail, t: 'Email', v: 'ganeshpwayal@gmail.com', href: 'mailto:ganeshpwayal@gmail.com' },
  { icon: Clock, t: 'Hours', v: 'Mon–Sat · 10am – 8pm' },
];

const TOPICS = ['General', 'Custom order', 'Delivery', 'Returns', 'Partnership'];

export default function Contact() {
  const { toast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', message: '', topic: 'General' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [showMap, setShowMap] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = 'Tell us your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Enter a valid email';
    if (form.message.trim().length < 10) err.message = 'A little more detail, please (10+ characters)';
    setErrors(err);
    if (Object.keys(err).length) return;
    setStatus('sending');
    api('/messages', { method: 'POST', body: form })
      .then(() => setStatus('sent'))
      .catch((err) => {
        if (err.field) setErrors({ [err.field]: err.message });
        toast(err.message);
        setStatus('idle');
      });
  };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <Page className="contact" label="Contact">
      <header className="container page-hero">
        <p className="eyebrow">Contact us</p>
        <SplitText as="h1" className="mega" text="Let's talk." delay={0.3} />
        <Reveal delay={0.5}>
          <p className="lead narrow">Custom sofa, a delivery question or just saying hello? We usually reply within a day.</p>
        </Reveal>
      </header>

      <section className="container contact__grid">
        <div className="contact__info">
          {INFO.map(({ icon: Icon, t, v, href }, i) => (
            <Reveal key={t} delay={i * 0.06} className="info-card">
              <Icon size={20} strokeWidth={1.5} />
              <span className="muted small">{t}</span>
              {href ? <a href={href}>{v}</a> : <strong>{v}</strong>}
            </Reveal>
          ))}
          <Reveal className="map" delay={0.2}>
            {/* The Google Maps embed is heavy, so it only loads when the visitor asks for it. */}
            {showMap ? (
              <iframe
                title="Gany's studio location"
                src="https://www.google.com/maps?q=Pune,Maharashtra,India&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <button className="map__facade" onClick={() => setShowMap(true)}>
                <MapPin size={28} strokeWidth={1.5} />
                <strong>Pune, Maharashtra</strong>
                <span className="btn btn--dark btn--sm">Show map</span>
              </button>
            )}
          </Reveal>
        </div>

        <Reveal className="contact__form-wrap" delay={0.15}>
          <AnimatePresence mode="wait">
            {status === 'sent' ? (
              <motion.div
                key="done"
                className="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ease }}
              >
                <motion.span
                  className="sent__icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Check size={32} />
                </motion.span>
                <h3>Message sent!</h3>
                <p className="muted">
                  Thanks {form.name.split(' ')[0]}, we'll be in touch at {form.email} soon.
                </p>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setForm({ name: '', email: '', message: '', topic: 'General' });
                    setStatus('idle');
                  }}
                >
                  Send another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} className="contact__form" exit={{ opacity: 0, y: -20 }} noValidate>
                <h2>Get in touch</h2>
                <div className="chips">
                  {TOPICS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`chip ${form.topic === t ? 'is-active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, topic: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {[
                  { k: 'name', label: 'Your name' },
                  { k: 'email', label: 'Email address', type: 'email' },
                ].map((f) => (
                  <label key={f.k} className={`field ${errors[f.k] ? 'has-error' : ''}`}>
                    <input type={f.type ?? 'text'} value={form[f.k]} onChange={set(f.k)} placeholder=" " />
                    <span className="field__label">{f.label}</span>
                    {errors[f.k] && <small className="field__error">{errors[f.k]}</small>}
                  </label>
                ))}
                <label className={`field ${errors.message ? 'has-error' : ''}`}>
                  <textarea rows={5} value={form.message} onChange={set('message')} placeholder=" " maxLength={600} />
                  <span className="field__label">How can we help?</span>
                  <span className="field__count">{form.message.length}/600</span>
                  {errors.message && <small className="field__error">{errors.message}</small>}
                </label>
                <button className="btn btn--accent btn--block" disabled={status === 'sending'}>
                  {status === 'sending' ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      Send message <Send size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>
      </section>
    </Page>
  );
}
