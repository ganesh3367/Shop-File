import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getProduct } from '../data/products';
import { api } from '../lib/api';

const StoreContext = createContext(null);
const STORAGE_KEY = 'gany-store-v2';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const initial = () => {
  const saved = load();
  return {
    cart: saved.cart ?? [],
    wishlist: saved.wishlist ?? [],
    // Signed-in customer and their API token (verified against the server on load).
    user: saved.token ? (saved.user ?? null) : null,
    token: saved.token ?? null,
    // Light is the default; dark only applies once the visitor has toggled it themselves.
    theme: saved.themeChosen ? saved.theme : 'light',
    themeChosen: !!saved.themeChosen,
  };
};

// Cart lines are keyed by product + variant so the same sofa in two colours stays separate.
const lineKey = (id, color, material) => `${id}::${color}::${material}`;

function reducer(state, action) {
  switch (action.type) {
    case 'cart/add': {
      const { id, color, material, qty = 1 } = action;
      const key = lineKey(id, color, material);
      const exists = state.cart.find((l) => l.key === key);
      const cart = exists
        ? state.cart.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, 10) } : l))
        : [...state.cart, { key, id, color, material, qty }];
      return { ...state, cart };
    }
    case 'cart/qty':
      return {
        ...state,
        cart: state.cart
          .map((l) => (l.key === action.key ? { ...l, qty: Math.max(0, Math.min(action.qty, 10)) } : l))
          .filter((l) => l.qty > 0),
      };
    case 'cart/remove':
      return { ...state, cart: state.cart.filter((l) => l.key !== action.key) };
    case 'cart/clear':
      return { ...state, cart: [] };
    case 'wishlist/toggle':
      return {
        ...state,
        wishlist: state.wishlist.includes(action.id) ? state.wishlist.filter((w) => w !== action.id) : [...state.wishlist, action.id],
      };
    case 'auth/set':
      return { ...state, user: action.user, token: action.token };
    case 'theme/toggle':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark', themeChosen: true };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      const { cart, wishlist, user, token, theme, themeChosen } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart, wishlist, user, token, theme, themeChosen }));
    } catch {
      /* storage unavailable — state simply won't persist */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // Confirm a saved login is still valid; sign out quietly if the token was rejected.
  useEffect(() => {
    if (!state.token) return;
    api('/auth/me', { token: state.token })
      .then(({ user }) => dispatch({ type: 'auth/set', user, token: state.token }))
      .catch((err) => err.status === 401 && dispatch({ type: 'auth/set', user: null, token: null }));
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((message, opts = {}) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration ?? 3200);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const value = useMemo(() => {
    const lines = state.cart.map((l) => ({ ...l, product: getProduct(l.id) })).filter((l) => l.product);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);

    return {
      ...state,
      lines,
      subtotal,
      count,
      cartOpen,
      setCartOpen,
      searchOpen,
      setSearchOpen,
      toasts,
      toast,
      dismissToast,
      addToCart: (product, { color, material, qty = 1, silent = false } = {}) => {
        dispatch({
          type: 'cart/add',
          id: product.id,
          color: color ?? product.colors[0].name,
          material: material ?? product.materials[0],
          qty,
        });
        if (!silent) toast(`${product.name} added to your bag`, { image: product.image, action: 'cart' });
      },
      setQty: (key, qty) => dispatch({ type: 'cart/qty', key, qty }),
      removeLine: (key) => dispatch({ type: 'cart/remove', key }),
      clearCart: () => dispatch({ type: 'cart/clear' }),
      toggleWishlist: (product) => {
        const saved = state.wishlist.includes(product.id);
        dispatch({ type: 'wishlist/toggle', id: product.id });
        toast(saved ? `Removed from wishlist` : `Saved ${product.name} to wishlist`, { image: product.image });
      },
      isWished: (id) => state.wishlist.includes(id),
      // Customer auth — both throw ApiError with a user-facing message on failure.
      signup: async (fields) => {
        const { user, token } = await api('/auth/signup', { method: 'POST', body: fields });
        dispatch({ type: 'auth/set', user, token });
        return user;
      },
      login: async (fields) => {
        const { user, token } = await api('/auth/login', { method: 'POST', body: fields });
        dispatch({ type: 'auth/set', user, token });
        return user;
      },
      logout: () => dispatch({ type: 'auth/set', user: null, token: null }),
      toggleTheme: () => dispatch({ type: 'theme/toggle' }),
    };
  }, [state, cartOpen, searchOpen, toasts, toast, dismissToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};
