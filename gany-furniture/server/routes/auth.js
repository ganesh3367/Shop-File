import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { publicUser, requireAuth, signToken } from '../auth.js';
import { body, forgotSchema, loginSchema, resetSchema, signupSchema } from '../validate.js';

const router = Router();
const RESET_TTL_MIN = 30;

router.post('/signup', body(signupSchema), (req, res) => {
  const { name, email, password } = req.body;
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists', field: 'email' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', body(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

/**
 * Create a single-use reset token. Only its SHA-256 hash is stored, so a leaked database can't be used to reset passwords.
 * Used by "forgot password" and by admins generating a link for a customer.
 */
export function createResetLink(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hash, userId, expires);
  return { url: `/reset-password?token=${token}`, expiresAt: expires };
}

router.post('/forgot', body(forgotSchema), (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(req.body.email);
  const reply = { ok: true, message: "If that email has an account, we've created a reset link." };
  if (!user) return res.json(reply);

  const link = createResetLink(user.id);
  // No email service is configured, so the link is logged for the operator and — in development only — returned.
  console.log(`[auth] Password reset link for ${req.body.email}: ${link.url}`);
  res.json(process.env.NODE_ENV === 'production' ? reply : { ...reply, devResetUrl: link.url });
});

router.post('/reset', body(resetSchema), (req, res) => {
  const hash = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hash);
  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(req.body.password, 10), row.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(row.user_id);
  })();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

export default router;
