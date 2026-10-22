import { useState } from 'react';
import { Mail, MailOpen, Reply, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { fmtDateTime } from './lib';
import { PageHead } from './Dashboard';
import { useAdmin } from './data';
import { Empty } from './ui';

export default function Messages() {
  const { toast } = useStore();
  const { messages, setMessageRead, deleteMessage } = useAdmin();
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  const list = messages.filter((m) => filter === 'all' || (filter === 'unread' ? !m.read : m.topic === filter));
  const topics = [...new Set(messages.map((m) => m.topic))];
  const open = messages.find((m) => m.id === openId);

  const select = (m) => {
    setOpenId(m.id);
    if (!m.read) setMessageRead(m.id, true).catch((err) => toast(err.message));
  };

  return (
    <>
      <PageHead title="Messages" />
      <div className="filters-row">
        <div className="chips">
          {['all', 'unread', ...topics].map((t) => (
            <button key={t} className={`chip ${filter === t ? 'is-active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : t === 'unread' ? 'Unread' : t}
              <sup>
                {t === 'all'
                  ? messages.length
                  : t === 'unread'
                    ? messages.filter((m) => !m.read).length
                    : messages.filter((m) => m.topic === t).length}
              </sup>
            </button>
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <Empty title="Inbox is empty">
          <p className="muted">Messages sent from the Contact page land here.</p>
        </Empty>
      ) : (
        <div className="inbox">
          <ul className="inbox__list panel panel--flush">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  className={`inbox__item ${m.id === openId ? 'is-active' : ''} ${m.read ? '' : 'is-unread'}`}
                  onClick={() => select(m)}
                >
                  <span className="inbox__row">
                    <strong>{m.name}</strong>
                    <small className="muted">{fmtDateTime(m.date)}</small>
                  </span>
                  <span className="pill-mini">{m.topic}</span>
                  <span className="inbox__preview muted">{m.message}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="muted center pad">Nothing here.</li>}
          </ul>

          <div className="panel inbox__read">
            {open ? (
              <>
                <div className="panel__head">
                  <div>
                    <h3 className="panel__title">{open.name}</h3>
                    <a href={`mailto:${open.email}`} className="muted small">
                      {open.email}
                    </a>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() => setMessageRead(open.id, !open.read).catch((err) => toast(err.message))}
                      aria-label={open.read ? 'Mark unread' : 'Mark read'}
                    >
                      {open.read ? <Mail size={17} /> : <MailOpen size={17} />}
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() =>
                        deleteMessage(open.id)
                          .then(() => {
                            setOpenId(null);
                            toast('Message deleted');
                          })
                          .catch((err) => toast(err.message))
                      }
                      aria-label="Delete message"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <p className="muted small">
                  {open.topic} · {fmtDateTime(open.date)}
                </p>
                <p className="inbox__body">{open.message}</p>
                <a
                  className="btn btn--dark btn--sm"
                  href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your ${open.topic.toLowerCase()} enquiry`)}`}
                >
                  <Reply size={15} /> Reply by email
                </a>
              </>
            ) : (
              <p className="muted center pad">Select a message to read it.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
