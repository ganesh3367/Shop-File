// Thin fetch wrapper for the Express API (proxied at /api in dev, same origin in production).

export class ApiError extends Error {
  constructor(message, status, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the API running? (npm run dev)", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.field);
  return data;
}

// Admin token is shared by all admin tabs (invoices and packing slips open in a new tab); "Sign out" clears it.
const ADMIN_KEY = 'gany-admin-token';
export const adminToken = {
  get: () => {
    try {
      return localStorage.getItem(ADMIN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      t ? localStorage.setItem(ADMIN_KEY, t) : localStorage.removeItem(ADMIN_KEY);
    } catch {
      /* ignore */
    }
  },
};
