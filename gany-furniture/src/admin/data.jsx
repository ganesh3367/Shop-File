import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AdminContext = createContext(null);

/** Loads everything the admin panel needs from the API and exposes mutations that keep it in sync. */
export function AdminDataProvider({ token, onUnauthorized, children }) {
  const [data, setData] = useState({ orders: [], messages: [], subscribers: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const reload = useCallback(async () => {
    setError('');
    try {
      const [o, m, s, u] = await Promise.all([call('/orders'), call('/messages'), call('/subscribers'), call('/users')]);
      setData({ orders: o.orders, messages: m.messages, subscribers: s.subscribers, users: u.users });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      ...data,
      loading,
      error,
      reload,
      setOrderStatus: async (id, status) => {
        const { order } = await call(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
        setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? order : o)) }));
      },
      loadSample: async () => {
        const { orders } = await call('/sample', { method: 'POST' });
        setData((d) => ({ ...d, orders }));
      },
      removeSample: async () => {
        const { orders } = await call('/sample', { method: 'DELETE' });
        setData((d) => ({ ...d, orders }));
      },
      setMessageRead: async (id, read = true) => {
        // Optimistic: flip it now, roll back if the server refuses.
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
      },
    }),
    [data, loading, error, reload, call],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminDataProvider>');
  return ctx;
};
