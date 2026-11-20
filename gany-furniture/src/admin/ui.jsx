import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { formatPrice } from '../data/products';
import { STATUS_META, compactINR, fmtDate } from './lib';

export function StatusBadge({ status }) {
  // Timeline entries can also be return events ("Return approved"), shown neutrally.
  const { color, icon: Icon } = STATUS_META[status] ?? { color: 'var(--muted)', icon: RotateCcw };
  return (
    <span className="status" style={{ '--status': color }}>
      <Icon size={13} strokeWidth={2} />
      {status}
    </span>
  );
}

/** Stat tile: label · value · optional delta vs a named period. */
export function StatTile({ label, value, delta, period = 'vs previous period', goodWhenUp = true }) {
  const hasDelta = Number.isFinite(delta);
  const up = delta >= 0;
  const good = up === goodWhenUp;
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <strong className="tile__value">{value}</strong>
      {hasDelta && (
        <span className={`tile__delta ${good ? 'is-good' : 'is-bad'}`}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(delta).toFixed(0)}% <span className="muted">{period}</span>
        </span>
      )}
    </div>
  );
}

// No delta when there's nothing to compare against — "+100%" from zero would be misleading.
export const pctChange = (now, before) => (before > 0 ? ((now - before) / before) * 100 : NaN);

/** Round an axis max up to a clean number and return evenly spaced ticks. */
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(
    1,
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw),
  );
  // Stop at the first tick above the data so the tallest column fills most of the plot.
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/**
 * Single-series column chart of daily revenue.
 * One colour (the brand accent), no legend (the card title names the series),
 * hover tooltip with generous hit targets, and a table toggle for exact values.
 */
export function RevenueChart({
  data,
  unit = 'day',
  value = (d) => d.revenue,
  format = formatPrice,
  axis = compactINR,
  detail = (d) => `${d.orders} ${d.orders === 1 ? 'order' : 'orders'}`,
  label = 'Revenue',
}) {
  const dateLabel = (iso) => (unit === 'month' ? fmtDate(iso, { month: 'short' }) : fmtDate(iso));
  const dateLong = (iso) =>
    unit === 'month'
      ? fmtDate(iso, { month: 'long', year: 'numeric' })
      : fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  const wrap = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const height = 260;
  const pad = { top: 16, right: 8, bottom: 28, left: 52 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ticks = useMemo(() => niceTicks(Math.max(...data.map(value))), [data]);
  const yMax = ticks[ticks.length - 1];
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const band = innerW / data.length;
  const barW = Math.max(3, Math.min(28, band - 2)); // ≥2px surface gap between neighbours
  const y = (v) => pad.top + innerH - (v / yMax) * innerH;
  const labelEvery = Math.ceil(data.length / Math.floor(innerW / 56));

  // Column with 4px rounded top corners, square at the baseline.
  const colPath = (x, top, w) => {
    const h = pad.top + innerH - top;
    if (h <= 0) return '';
    const r = Math.min(4, w / 2, h);
    const b = pad.top + innerH;
    return `M${x},${b} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${b} Z`;
  };

  const total = data.reduce((s, d) => s + value(d), 0);
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="chart" ref={wrap}>
      <div className="chart__bar">
        <span className="muted small">
          {format(total)} across {data.length} {unit === 'month' ? 'months' : 'days'}
        </span>
        <div className="segmented">
          <button className={!asTable ? 'is-active' : ''} onClick={() => setAsTable(false)}>
            <span>Chart</span>
          </button>
          <button className={asTable ? 'is-active' : ''} onClick={() => setAsTable(true)}>
            <span>Table</span>
          </button>
        </div>
      </div>

      {asTable ? (
        <div className="chart__table" data-lenis-prevent>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">{label}</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{dateLong(d.date)}</td>
                  <td className="num">{format(value(d))}</td>
                  <td className="muted">{detail(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart__plot" onPointerLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={`${label} by ${unit}, total ${format(total)}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'chart__base' : 'chart__grid'} />
                <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">
                  {axis(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = pad.left + band * i + band / 2;
              return (
                <g key={d.date}>
                  {hover === i && <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} className="chart__hoverband" />}
                  <path
                    d={colPath(cx - barW / 2, y(value(d)), barW)}
                    className="chart__col"
                    opacity={hover == null || hover === i ? 1 : 0.45}
                  />
                  {i % labelEvery === 0 && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="chart__tick">
                      {dateLabel(d.date)}
                    </text>
                  )}
                  {/* Hit target is the whole column band, not just the mark. */}
                  <rect
                    x={pad.left + band * i}
                    y={pad.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${dateLong(d.date)}: ${format(value(d))}, ${detail(d)}`}
                  />
                </g>
              );
            })}
          </svg>
          {hovered && (
            <div
              className="chart__tip"
              style={{
                left: Math.min(Math.max(pad.left + band * hover + band / 2, 90), width - 90),
                top: Math.max(y(value(hovered)) - 12, 8),
              }}
            >
              <span className="muted small">{dateLong(hovered.date)}</span>
              <strong>{format(value(hovered))}</strong>
              <span className="small">{detail(hovered)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal bar list: label · bar · value. Single hue; value text in ink, not the bar colour. */
export function BarList({ rows, format = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="barlist">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="barlist__row">
            <span>{r.label}</span>
            <strong>{format(r.value)}</strong>
          </div>
          <div className="barlist__track">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="admin-empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
