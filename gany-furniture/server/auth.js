import jwt from 'jsonwebtoken';
import { db, jwtSecret } from './db.js';

const SECRET = jwtSecret();
const TOKEN_TTL = '7d';

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export const signToken = (user) => jwt.sign({ sub: String(user.id), role: user.role }, SECRET, { expiresIn: TOKEN_TTL });

function userFromRequest(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const { sub } = jwt.verify(token, SECRET);
    // Re-read from the DB so deleted users and role changes take effect immediately.
    return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(Number(sub)) ?? null;
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is present, but never blocks. */
export function optionalAuth(req, _res, next) {
  req.user = userFromRequest(req);
  next();
}

export function requireAuth(req, res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  next();
}

export function requireAdmin(req, res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
