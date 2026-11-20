import jwt from 'jsonwebtoken';
import { db, jwtSecret } from './db.js';

const TOKEN_TTL = '7d';

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export const signToken = (user) => jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret(), { expiresIn: TOKEN_TTL });

async function userFromRequest(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  let sub;
  try {
    ({ sub } = jwt.verify(token, jwtSecret()));
  } catch {
    return null;
  }
  // Re-read from the database so deleted users and role changes take effect immediately.
  return (await db.get('SELECT id, name, email, role FROM users WHERE id = ?', Number(sub))) ?? null;
}

/** Attaches req.user when a valid token is present, but never blocks. */
export async function optionalAuth(req, _res, next) {
  req.user = await userFromRequest(req);
  next();
}

export async function requireAuth(req, res, next) {
  req.user = await userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  next();
}

export async function requireAdmin(req, res, next) {
  req.user = await userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
