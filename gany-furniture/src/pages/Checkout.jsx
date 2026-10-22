import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, CreditCard, Lock, MapPin, Plane, Smartphone, Tag, Truck, Wallet, X, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { FREE_SHIPPING_AT, formatPrice, sized } from '../data/products';
import { Page, ease } from '../components/motion';

const STEPS = ['Shipping', 'Delivery', 'Payment'];

// Shipping methods carried over from the original shipping form (Ground / Air / Express).
const METHODS = [
  { id: 'ground', name: 'Ground', desc: '5–7 business days', price: 0, icon: Truck },
  { id: 'air', name: 'Air', desc: '2–3 business days', price: 1499, icon: Plane },
  { id: 'express', name: 'Express', desc: 'Next day in Pune & Mumbai', price: 2999, icon: Zap },
];

const PAYMENTS = [
  { id: 'upi', name: 'UPI', icon: Smartphone },
  { id: 'card', name: 'Card', icon: CreditCard },
  { id: 'cod', name: 'Pay on delivery', icon: Wallet },
];

const FIELDS = [
  { name: 'name', label: 'Full name', auto: 'name', span: 2 },
  { name: 'email', label: 'Email', type: 'email', auto: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', auto: 'tel' },
  { name: 'address', label: 'Address', auto: 'street-address', span: 2 },
  { name: 'city', label: 'City', auto: 'address-level2' },
  { name: 'state', label: 'State', auto: 'address-level1' },
  { name: 'zip', label: 'PIN code', auto: 'postal-code', inputMode: 'numeric' },
  { name: 'country', label: 'Country', auto: 'country-name' },
];

const validators = {
  name: (v) => v.trim().length >= 2 || 'Please enter your name',
  email: (v) => /^\S+@\S+\.\S+$/.test(v) || 'Enter a valid email',
  phone: (v) => /^[+\d][\d\s-]{8,}$/.test(v) || 'Enter a valid phone number',
  address: (v) => v.trim().length >= 5 || 'Enter your street address',
  city: (v) => !!v.trim() || 'Required',
  state: (v) => !!v.trim() || 'Required',
  zip: (v) => /^\d{6}$/.test(v) || '6-digit PIN code',
  country: (v) => !!v.trim() || 'Required',
};

export default function Checkout() {
  const { lines, subtotal, clearCart, user, token, toast } = useStore();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    zip: '',
    country: 'India',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState('ground');
  const [payment, setPayment] = useState('upi');
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [coupon, setCoupon] = useState(null); // { code, discount, label }
  const [codeInput, setCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  const items = lines.map((l) => ({ id: l.id, qty: l.qty, color: l.color, material: l.material }));

  // Signed-in customers can pick a saved address; the default one pre-fills an empty form.
  useEffect(() => {
    if (!token) return;
    api('/account/addresses', { token })
      .then(({ addresses }) => {
        setAddresses(addresses);
        const def = addresses.find((a) => a.isDefault);
        if (def) setForm((f) => (f.address ? f : fillFrom(f, def)));
      })
      .catch(() => {});
  }, [token]);

  // Mirrors the server's maths (GST on the discounted amount); the server's figures are what's charged.
  const discount = coupon?.discount ?? 0;
  const taxable = subtotal - discount;
  const ship = METHODS.find((m) => m.id === method);
  const shipping = taxable >= FREE_SHIPPING_AT && method === 'ground' ? 0 : ship.price;
  const gst = Math.round(taxable * 0.18);
  const total = taxable + shipping + gst;

  const applyCode = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCheckingCode(true);
    setCouponError('');
    try {
      setCoupon(await api('/coupons/check', { method: 'POST', body: { code: codeInput, items } }));
      setCodeInput('');
    } catch (err) {
      setCouponError(err.message);
    } finally {
      setCheckingCode(false);
    }
  };

  const go = (n) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const validate = () => {
    const e = {};
    Object.entries(validators).forEach(([k, fn]) => {
      const r = fn(form[k]);
      if (r !== true) e[k] = r;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validate()) return;
    if (step < 2) return go(step + 1);
    placeOrderOnServer();
  };

  const placeOrderOnServer = async () => {
    setPlacing(true);
    try {
      // The server re-prices everything from its own catalogue; we only send ids, variants and quantities.
      const { order: saved } = await api('/orders', {
        method: 'POST',
        token,
        body: {
          customer: form,
          items,
          method,
          payment,
          coupon: coupon?.code,
          saveAddress: !!token && saveAddress,
        },
      });
      setOrder({ id: saved.id, total: saved.total, items: saved.items.length, signedIn: !!token });
      clearCart();
      // Confirmation renders on the same route, so reset scroll ourselves.
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    } catch (err) {
      // Field errors from the server send the shopper back to the form with the message in place.
      const field = err.field?.startsWith('customer.') ? err.field.slice(9) : null;
      if (err.field === 'coupon') {
        setCoupon(null);
        setCouponError(err.message);
      } else if (field) {
        setErrors({ [field]: err.message });
        go(0);
      }
      toast(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (order) return <Confirmation order={order} />;

  if (lines.length === 0) {
    return (
      <Page className="checkout" label="Checkout">
        <div className="container empty empty--page">
          <h1 className="display">Your bag is empty.</h1>
          <p className="muted">Add a few pieces you love, then come back to check out.</p>
          <Link to="/shop" className="btn btn--dark">
            Browse the collection
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page className="checkout" label="Checkout">
      <div className="container checkout__grid">
        <div className="checkout__main">
          <Link to="/shop" className="text-link back">
            <ArrowLeft size={16} /> Continue shopping
          </Link>
          <h1 className="display">Checkout</h1>

          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s} className={`${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`}>
                <button onClick={() => i < step && go(i)} disabled={i > step}>
                  <span className="steps__dot">{i < step ? <Check size={14} /> : i + 1}</span>
                  {s}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="steps__line">
                    <motion.span animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.6, ease }} />
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="checkout__panel">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.45, ease }}
              >
                {step === 0 && addresses.length > 0 && (
                  <div className="saved-addresses">
                    <span className="muted small">
                      <MapPin size={14} /> Deliver to a saved address
                    </span>
                    <div className="chips">
                      {addresses.map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          className={`chip ${form.address === a.address && form.zip === a.zip ? 'is-active' : ''}`}
                          onClick={() => {
                            setForm((f) => fillFrom(f, a));
                            setErrors({});
                          }}
                        >
                          {a.label} · {a.address.slice(0, 22)}
                          {a.address.length > 22 ? '…' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {step === 0 && (
                  <div className="form-grid">
                    {FIELDS.map((f) => (
                      <Field
                        key={f.name}
                        {...f}
                        value={form[f.name]}
                        error={errors[f.name]}
                        onChange={(v) => {
                          setForm((s) => ({ ...s, [f.name]: v }));
                          if (errors[f.name]) setErrors((e) => ({ ...e, [f.name]: undefined }));
                        }}
                      />
                    ))}
                    <Field
                      name="notes"
                      label="Special instructions (optional)"
                      textarea
                      span={2}
                      value={form.notes}
                      onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
                    />
                    {token && !addresses.some((a) => a.address === form.address && a.zip === form.zip) && (
                      <label className="check field--wide">
                        <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                        Save this address to my account
                      </label>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="radio-cards">
                    {METHODS.map((m) => {
                      const Icon = m.icon;
                      const free = m.id === 'ground' && taxable >= FREE_SHIPPING_AT;
                      return (
                        <label key={m.id} className={`radio-card ${method === m.id ? 'is-active' : ''}`}>
                          <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                          {method === m.id && <motion.span layoutId="method-hl" className="radio-card__hl" />}
                          <Icon size={22} strokeWidth={1.5} />
                          <span>
                            <strong>{m.name}</strong>
                            <small className="muted">{m.desc}</small>
                          </span>
                          <em>{m.price === 0 || free ? 'Free' : formatPrice(m.price)}</em>
                        </label>
                      );
                    })}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="radio-cards radio-cards--row">
                      {PAYMENTS.map((p) => {
                        const Icon = p.icon;
                        return (
                          <label key={p.id} className={`radio-card ${payment === p.id ? 'is-active' : ''}`}>
                            <input type="radio" name="pay" checked={payment === p.id} onChange={() => setPayment(p.id)} />
                            {payment === p.id && <motion.span layoutId="pay-hl" className="radio-card__hl" />}
                            <Icon size={22} strokeWidth={1.5} />
                            <strong>{p.name}</strong>
                          </label>
                        );
                      })}
                    </div>
                    <div className="review">
                      <h4>Delivering to</h4>
                      <p>
                        {form.name} · {form.phone}
                        <br />
                        {form.address}, {form.city}, {form.state} {form.zip}, {form.country}
                      </p>
                      <p className="muted small">
                        {ship.name} shipping · {ship.desc}
                      </p>
                    </div>
                    <p className="muted small secure">
                      <Lock size={14} /> This is a demo store. No real payment is taken.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="checkout__nav">
            {step > 0 && (
              <button className="btn btn--ghost" onClick={() => go(step - 1)}>
                Back
              </button>
            )}
            <button className="btn btn--accent btn--grow" onClick={next} disabled={placing}>
              {placing ? (
                <span className="spinner" />
              ) : step < 2 ? (
                `Continue to ${STEPS[step + 1].toLowerCase()}`
              ) : (
                `Place order · ${formatPrice(total)}`
              )}
            </button>
          </div>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>
          <ul>
            {lines.map((l) => (
              <li key={l.key}>
                <span className="summary__img">
                  <img src={sized(l.product.image, 160)} alt="" />
                  <sup>{l.qty}</sup>
                </span>
                <span>
                  <strong>{l.product.name}</strong>
                  <small className="muted">
                    {l.color} · {l.material}
                  </small>
                </span>
                <span>{formatPrice(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          {coupon ? (
            <div className="coupon-applied">
              <Tag size={15} />
              <span>
                <strong>{coupon.code}</strong> · {coupon.label}
              </span>
              <button className="icon-btn" onClick={() => setCoupon(null)} aria-label="Remove code">
                <X size={15} />
              </button>
            </div>
          ) : (
            <form className="coupon-form" onSubmit={applyCode}>
              <input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setCouponError('');
                }}
                placeholder="Discount code"
                aria-label="Discount code"
                maxLength={30}
              />
              <button className="btn btn--ghost btn--sm" disabled={checkingCode || !codeInput.trim()}>
                {checkingCode ? <span className="spinner" /> : 'Apply'}
              </button>
            </form>
          )}
          {couponError && <p className="form-error small">{couponError}</p>}
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="summary__discount">
                <dt>Discount ({coupon.code})</dt>
                <dd>−{formatPrice(discount)}</dd>
              </div>
            )}
            <div>
              <dt>Shipping</dt>
              <dd>
                <AnimatePresence mode="wait">
                  <motion.span key={shipping} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </motion.span>
                </AnimatePresence>
              </dd>
            </div>
            <div>
              <dt>GST (18%)</dt>
              <dd>{formatPrice(gst)}</dd>
            </div>
            <div className="summary__total">
              <dt>Total</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </Page>
  );
}

const fillFrom = (f, a) => ({
  ...f,
  name: a.name,
  phone: a.phone,
  address: a.address,
  city: a.city,
  state: a.state,
  zip: a.zip,
  country: a.country,
});

function Field({ name, label, type = 'text', value, onChange, error, span = 1, textarea, auto, inputMode }) {
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <label className={`field ${span === 2 ? 'field--wide' : ''} ${error ? 'has-error' : ''} ${value ? 'has-value' : ''}`}>
      <Tag
        name={name}
        type={textarea ? undefined : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        autoComplete={auto}
        inputMode={inputMode}
        rows={textarea ? 3 : undefined}
      />
      <span className="field__label">{label}</span>
      <AnimatePresence>
        {error && (
          <motion.small className="field__error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {error}
          </motion.small>
        )}
      </AnimatePresence>
    </label>
  );
}

function Confirmation({ order }) {
  const pieces = Array.from({ length: 36 });
  const colors = ['#b5562f', '#6b6f4f', '#d9cfbf', '#c9a57a', '#1c1a17'];
  return (
    <Page className="confirm" label="Thank you">
      <div className="confetti" aria-hidden>
        {pieces.map((_, i) => (
          <motion.span
            key={i}
            style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length] }}
            initial={{ y: -40, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', rotate: 720 * (i % 2 ? 1 : -1), opacity: [1, 1, 0] }}
            transition={{ duration: 2.5 + (i % 5) * 0.4, delay: (i % 8) * 0.12, ease: 'easeIn' }}
          />
        ))}
      </div>
      <div className="container confirm__inner">
        <motion.div
          className="confirm__check"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.5 }}
        >
          <svg viewBox="0 0 52 52">
            <motion.path
              d="M14 27 l8 8 l16 -18"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            />
          </svg>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease }}>
          <p className="eyebrow">Order {order.id}</p>
          <h1 className="display">Thank you. Your new pieces are on their way.</h1>
          <p className="lead">
            You paid <strong>{formatPrice(order.total)}</strong> for {order.items} {order.items === 1 ? 'item' : 'items'}. Our delivery team
            will call you to book a time.{' '}
            {order.signedIn
              ? 'You can follow every step from your account.'
              : `Keep your order number (${order.id}) handy for any questions.`}
          </p>
          <div className="confirm__ctas">
            {order.signedIn ? (
              <Link to={`/account/orders/${order.id}`} className="btn btn--dark">
                Track this order
              </Link>
            ) : (
              <Link to="/shop" className="btn btn--dark">
                Keep exploring
              </Link>
            )}
            <Link to="/" className="btn btn--ghost">
              Back home
            </Link>
          </div>
        </motion.div>
      </div>
    </Page>
  );
}
