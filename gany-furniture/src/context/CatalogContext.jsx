import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const CatalogContext = createContext(null);

/**
 * Loads the live catalogue from the API once and shares it with the whole app.
 * The storefront waits for it; the admin panel loads its own (unfiltered) product list.
 */
export function CatalogProvider({ children, blocking = true }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const { products } = await api('/products');
      setProducts(products);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => {
    const list = products ?? [];
    const byId = new Map(list.map((p) => [p.id, p]));
    return { products: list, getProduct: (id) => byId.get(id), loaded: !!products, reload };
  }, [products, reload]);

  if (blocking && !products) {
    return (
      <div className="boot">
        {error ? (
          <div className="boot__error">
            <h1>We can't reach the store right now.</h1>
            <p className="muted">{error}</p>
            <button className="btn btn--dark" onClick={reload}>
              Try again
            </button>
          </div>
        ) : (
          <span className="spinner" aria-label="Loading" />
        )}
      </div>
    );
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
};
