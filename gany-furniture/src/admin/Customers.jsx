import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { formatPrice } from '../data/products';
import { customersFrom, downloadCSV, fmtDate } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

const TABS = ['customers', 'accounts', 'newsletter'];
const longDate = { day: 'numeric', month: 'short', year: 'numeric' };

export default function Customers() {
  const { orders, subscribers, users } = useAdmin();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'customers';
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const match = (...fields) => !query || fields.join(' ').toLowerCase().includes(query);
  const allCustomers = useMemo(() => customersFrom(orders), [orders]);
  const customers = allCustomers.filter((c) => match(c.name, c.email, c.city));
  const accounts = users.filter((u) => match(u.name, u.email, u.role));
  const subs = subscribers.filter((s) => match(s.email));

  const exportCSV = () => {
    if (tab === 'customers')
      downloadCSV('gany-customers.csv', [
        ['Name', 'Email', 'Phone', 'City', 'Orders', 'Total spent', 'Last order'],
        ...customers.map((c) => [c.name, c.email, c.phone, c.city, c.orders, c.spent, c.last]),
      ]);
    else if (tab === 'accounts')
      downloadCSV('gany-accounts.csv', [
        ['Name', 'Email', 'Role', 'Orders', 'Total spent', 'Joined'],
        ...accounts.map((u) => [u.name, u.email, u.role, u.orders, u.spent, u.date]),
      ]);
    else downloadCSV('gany-subscribers.csv', [['Email', 'Subscribed'], ...subs.map((s) => [s.email, s.date])]);
  };

  const tabLabel = {
    customers: `Customers · ${allCustomers.length}`,
    accounts: `Accounts · ${users.length}`,
    newsletter: `Newsletter · ${subscribers.length}`,
  };

  return (
    <>
      <PageHead title="Customers">
        <button className="btn btn--ghost btn--sm" onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </PageHead>

      <div className="filters-row">
        <div className="segmented">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setParams(t === 'customers' ? {} : { tab: t })}>
              <span>{tabLabel[t]}</span>
            </button>
          ))}
        </div>
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </label>
      </div>

      {tab === 'customers' &&
        (customers.length === 0 ? (
          <Empty title="No customers yet">
            <p className="muted">Anyone who places an order, with or without an account, appears here.</p>
          </Empty>
        ) : (
          <Table head={['Customer', 'Phone', 'City', ['Orders', 'num'], ['Total spent', 'num'], 'Last order']}>
            {customers.map((c) => (
              <tr key={c.email}>
                <td>
                  <Person name={c.name} email={c.email} />
                </td>
                <td className="muted">{c.phone}</td>
                <td>{c.city}</td>
                <td className="num">{c.orders}</td>
                <td className="num">
                  <strong>{formatPrice(c.spent)}</strong>
                </td>
                <td className="muted">{fmtDate(c.last)}</td>
              </tr>
            ))}
          </Table>
        ))}

      {tab === 'accounts' &&
        (accounts.length === 0 ? (
          <Empty title="No accounts yet">
            <p className="muted">Shoppers who sign up on the Log in page appear here.</p>
          </Empty>
        ) : (
          <Table head={['Account', 'Role', ['Orders', 'num'], ['Total spent', 'num'], 'Joined']}>
            {accounts.map((u) => (
              <tr key={u.id}>
                <td>
                  <Person name={u.name} email={u.email} />
                </td>
                <td>
                  <span className="pill-mini">{u.role}</span>
                </td>
                <td className="num">{u.orders}</td>
                <td className="num">
                  <strong>{formatPrice(u.spent)}</strong>
                </td>
                <td className="muted">{fmtDate(u.date, longDate)}</td>
              </tr>
            ))}
          </Table>
        ))}

      {tab === 'newsletter' &&
        (subs.length === 0 ? (
          <Empty title="No subscribers yet">
            <p className="muted">Sign-ups from the newsletter box in the site footer appear here.</p>
          </Empty>
        ) : (
          <Table head={['Email', 'Subscribed']}>
            {subs.map((s) => (
              <tr key={s.email}>
                <td>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </td>
                <td className="muted">{fmtDate(s.date, longDate)}</td>
              </tr>
            ))}
          </Table>
        ))}
    </>
  );
}

function Table({ head, children }) {
  return (
    <div className="panel panel--flush">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {head.map((h) => {
                const [label, cls] = Array.isArray(h) ? h : [h, ''];
                return (
                  <th key={label} className={cls}>
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Person({ name, email }) {
  return (
    <span className="product-cell">
      <span className="avatar">{name[0]}</span>
      <span className="cell-stack">
        <strong>{name}</strong>
        <a href={`mailto:${email}`} className="muted small">
          {email}
        </a>
      </span>
    </span>
  );
}
