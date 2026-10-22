import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../data/products';
import { fmtDate } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

const BLANK = { code: '', kind: 'percent', value: 10, minSubtotal: 0, maxUses: '', expiresAt: '', active: true };

const describe = (c) => (c.kind === 'percent' ? `${c.value}% off` : `${formatPrice(c.value)} off`);

function status(c) {
  if (!c.active) return ['Disabled', ''];
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return ['Expired', ''];
  if (c.maxUses != null && c.used >= c.maxUses) return ['Used up', ''];
  return ['Active', 'pill-mini--ok'];
}

export default function Coupons() {
  const { coupons, saveCoupon, deleteCoupon } = useAdmin();
  const { toast } = useStore();
  const [editing, setEditing] = useState(null); // null | 'new' | code
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState({ message: '', field: '' });
  const [busy, setBusy] = useState(false);

  const open = (c) => {
    setError({ message: '', field: '' });
    if (!c) {
      setForm(BLANK);
      setEditing('new');
    } else {
      setForm({ ...c, maxUses: c.maxUses ?? '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' });
      setEditing(c.code);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError({ message: '', field: '' });
    try {
      await saveCoupon(
        {
          code: form.code,
          kind: form.kind,
          value: Number(form.value),
          minSubtotal: Number(form.minSubtotal || 0),
          maxUses: form.maxUses === '' ? null : Number(form.maxUses),
          // End of the chosen day, local time.
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
          active: form.active,
        },
        editing === 'new' ? null : editing,
      );
      toast(editing === 'new' ? `Code ${form.code.toUpperCase()} created` : 'Code updated');
      setEditing(null);
    } catch (err) {
      setError({ message: err.message, field: err.field ?? '' });
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const field = (k, label, props = {}) => (
    <label className={`field ${error.field === k ? 'has-error' : ''}`}>
      <input value={form[k]} onChange={set(k)} placeholder=" " {...props} />
      <span className="field__label">{label}</span>
      {error.field === k && <small className="field__error">{error.message}</small>}
    </label>
  );

  return (
    <>
      <PageHead title="Discount codes">
        <button className="btn btn--dark btn--sm" onClick={() => open(null)}>
          <Plus size={15} /> New code
        </button>
      </PageHead>

      <AnimatePresence>
        {editing && (
          <motion.form
            className="panel coupon-editor"
            onSubmit={save}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            noValidate
          >
            <h3 className="panel__title">{editing === 'new' ? 'New discount code' : `Edit ${editing}`}</h3>
            <div className="coupon-editor__grid">
              {editing === 'new'
                ? field('code', 'Code (e.g. DIWALI15)', { style: { textTransform: 'uppercase' }, maxLength: 20 })
                : field('code', 'Code', { disabled: true })}
              <label className="field">
                <select value={form.kind} onChange={set('kind')} className="field__select">
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off (₹)</option>
                </select>
                <span className="field__label field__label--fixed">Type</span>
              </label>
              {field('value', form.kind === 'percent' ? 'Percent (1–90)' : 'Amount (₹)', { inputMode: 'numeric' })}
              {field('minSubtotal', 'Minimum subtotal (₹)', { inputMode: 'numeric' })}
              {field('maxUses', 'Max uses (blank = unlimited)', { inputMode: 'numeric' })}
              <label className="field">
                <input type="date" value={form.expiresAt} onChange={set('expiresAt')} placeholder=" " />
                <span className="field__label field__label--fixed">Expires (optional)</span>
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={form.active} onChange={set('active')} /> Active
            </label>
            {error.message && !['code', 'value', 'minSubtotal', 'maxUses'].includes(error.field) && (
              <p className="form-error">{error.message}</p>
            )}
            <div className="return-card__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn--dark btn--sm" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Save code'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {coupons.length === 0 ? (
        <Empty title="No discount codes">
          <p className="muted">Create a code, share it with customers, and track how much revenue it brings in.</p>
        </Empty>
      ) : (
        <div className="panel panel--flush">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Conditions</th>
                  <th className="num">Used</th>
                  <th className="num">Discount given</th>
                  <th className="num">Order revenue</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const [label, cls] = status(c);
                  return (
                    <tr key={c.code}>
                      <td>
                        <button
                          className="coupon-code"
                          onClick={() => navigator.clipboard?.writeText(c.code).then(() => toast(`Copied ${c.code}`))}
                          title="Copy code"
                        >
                          {c.code} <Copy size={12} />
                        </button>
                      </td>
                      <td>{describe(c)}</td>
                      <td className="muted small">
                        {c.minSubtotal > 0 ? `Over ${formatPrice(c.minSubtotal)}` : 'Any order'}
                        {c.expiresAt && ` · until ${fmtDate(c.expiresAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </td>
                      <td className="num">
                        {c.used}
                        {c.maxUses != null && <span className="muted"> / {c.maxUses}</span>}
                      </td>
                      <td className="num">{formatPrice(c.discountGiven)}</td>
                      <td className="num">
                        <strong>{formatPrice(c.revenue)}</strong>
                      </td>
                      <td>
                        <span className={`pill-mini ${cls}`}>{label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => open(c)} aria-label={`Edit ${c.code}`}>
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() =>
                              window.confirm(`Delete ${c.code}? Past orders keep their discount.`) &&
                              deleteCoupon(c.code)
                                .then(() => toast(`${c.code} deleted`))
                                .catch((err) => toast(err.message))
                            }
                            aria-label={`Delete ${c.code}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
