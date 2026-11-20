import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../data/products';

const AdminContext = createContext(null);

const RESOURCES = {
  orders: '/orders',
  messages: '/messages',
  subscribers: '/subscribers',
  users: '/users',
  products: '/products',
  returns: '/returns',
  reviews: '/reviews',
  coupons: '/coupons',
  activity: '/activity',
};

/** A soft two-note chime for new orders (Web Audio, no sound file needed). */
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* audio not available */
  }
}

/**
 * Everything the admin panel shows, loaded from the API, plus mutations that keep it in sync
 * and a live event stream so new orders, returns, reviews and messages appear without a refresh.
 */
export function AdminDataProvider({ token, onUnauthorized, children }) {
  const { toast } = useStore();
  const [data, setData] = useState(() => Object.fromEntries(Object.keys(RESOURCES).map((k) => [k, []])));
  const [lowStock, setLowStock] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem('gany-admin-sound') !== 'off';
    } catch {
      return true;
    }
  });
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const call = useCallback(
    async (path, opts) => {
      try {
        return await api(`/admin${path}`, { ...opts, token });
      } catch (err) {
        if (err.status === 401 || err.status === 403) onUnauthorized();
        throw err;
      }
    },
    [token, onUnauthorized],
  );

  const refresh = useCallback(
    async (...keys) => {
      const list = keys.length ? keys : Object.keys(RESOURCES);
      const results = await Promise.all(list.map((k) => call(RESOURCES[k])));
      setData((d) => {
        const next = { ...d };
        list.forEach((k, i) => {
          next[k] = results[i][k];
          if (k === 'products') setLowStock(results[i].lowStock);
        });
        return next;
      });
    },
    [call],
  );

  const reload = useCallback(async () => {
    setError('');
    try {
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live updates over Server-Sent Events, read with fetch() so the token stays in a header.
  useEffect(() => {
    const ctrl = new AbortController();
    let retry;
    const connect = async () => {
      try {
        const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error('stream failed');
        setLive(true);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (line) handle(JSON.parse(line.slice(6)));
          }
        }
        throw new Error('stream ended');
      } catch {
        if (ctrl.signal.aborted) return;
        setLive(false);
        retry = setTimeout(connect, 4000);
      }
    };

    const handle = ({ type, payload }) => {
      if (type === 'order') {
        if (soundRef.current) chime();
        toast(`New order ${payload.id} · ${payload.name} · ${formatPrice(payload.total)}`, { duration: 6000 });
        refresh('orders', 'products', 'activity').catch(() => {});
      } else if (type === 'return') {
        toast(`Return requested for ${payload.orderId}: ${payload.reason}`, { duration: 6000 });
        refresh('returns', 'orders').catch(() => {});
      } else if (type === 'review') {
        toast(`New ${payload.rating}★ review on ${payload.product} awaiting approval`, { duration: 5000 });
        refresh('reviews').catch(() => {});
      } else if (type === 'message') {
        toast(`New message from ${payload.name} (${payload.topic})`, { duration: 5000 });
        refresh('messages').catch(() => {});
      }
    };

    connect();
    return () => {
      ctrl.abort();
      clearTimeout(retry);
    };
  }, [token, toast, refresh]);

  const value = useMemo(() => {
    const set = (key, list) => setData((d) => ({ ...d, [key]: list }));
    const replaceIn = (key, item, id = 'id') => setData((d) => ({ ...d, [key]: d[key].map((x) => (x[id] === item[id] ? item : x)) }));
    const after = (...keys) => refresh(...keys).catch(() => {});

    const upload = async (kind, file) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/uploads/${kind}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Upload failed');
      return d.url;
    };

    return {
      ...data,
      lowStock,
      loading,
      error,
      live,
      sound,
      setSound: (on) => {
        setSound(on);
        try {
          localStorage.setItem('gany-admin-sound', on ? 'on' : 'off');
        } catch {
          /* ignore */
        }
      },
      reload,
      refresh,
      call,

      // Orders
      setOrderStatus: async (id, status, note) => {
        const { order } = await call(`/orders/${id}/status`, { method: 'PATCH', body: { status, note } });
        replaceIn('orders', order);
        after('products', 'activity');
      },
      loadSample: async () => {
        set('orders', (await call('/sample', { method: 'POST' })).orders);
        after('activity');
      },
      removeSample: async () => {
        set('orders', (await call('/sample', { method: 'DELETE' })).orders);
        after('activity');
      },

      // Returns
      decideReturn: async (id, status, adminNote) => {
        const { returns, order } = await call(`/returns/${id}`, { method: 'PATCH', body: { status, adminNote } });
        set('returns', returns);
        replaceIn('orders', order);
        after('products', 'activity');
      },

      // Products
      saveProduct: async (product, originalId) => {
        const { product: saved } = originalId
          ? await call(`/products/${originalId}`, { method: 'PUT', body: product })
          : await call('/products', { method: 'POST', body: product });
        after('products', 'activity');
        return saved;
      },
      setStock: async (id, stock) => {
        const { product } = await call(`/products/${id}/stock`, { method: 'PATCH', body: { stock } });
        replaceIn('products', product);
        after('activity');
      },
      deleteProduct: async (id) => {
        const res = await call(`/products/${id}`, { method: 'DELETE' });
        after('products', 'activity');
        return res;
      },
      upload,

      // Reviews
      setReviewStatus: async (id, status) => {
        set('reviews', (await call(`/reviews/${id}`, { method: 'PATCH', body: { status } })).reviews);
        after('activity');
      },
      deleteReview: async (id) => {
        set('reviews', (await call(`/reviews/${id}`, { method: 'DELETE' })).reviews);
        after('activity');
      },

      // Coupons
      saveCoupon: async (coupon, existingCode) => {
        const { coupons } = existingCode
          ? await call(`/coupons/${existingCode}`, { method: 'PUT', body: coupon })
          : await call('/coupons', { method: 'POST', body: coupon });
        set('coupons', coupons);
        after('activity');
      },
      deleteCoupon: async (code) => {
        set('coupons', (await call(`/coupons/${code}`, { method: 'DELETE' })).coupons);
        after('activity');
      },

      // Messages
      setMessageRead: async (id, read = true) => {
        setData((d) => ({ ...d, messages: d.messages.map((m) => (m.id === id ? { ...m, read } : m)) }));
        try {
          await call(`/messages/${id}`, { method: 'PATCH', body: { read } });
        } catch (err) {
          setData((d) => ({ ...d, messages: d.messages.map((m) => (m.id === id ? { ...m, read: !read } : m)) }));
          throw err;
        }
      },
      deleteMessage: async (id) => {
        await call(`/messages/${id}`, { method: 'DELETE' });
        setData((d) => ({ ...d, messages: d.messages.filter((m) => m.id !== id) }));
        after('activity');
      },

      // Customers
      customerProfile: (email) => call(`/customers/${encodeURIComponent(email)}`),
      createResetLink: async (email) => {
        const link = await call(`/customers/${encodeURIComponent(email)}/reset-link`, { method: 'POST' });
        after('activity');
        return link;
      },
    };
  }, [data, lowStock, loading, error, live, sound, reload, refresh, call, token]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminDataProvider>');
  return ctx;
};
