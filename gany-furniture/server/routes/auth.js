import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { batch, db } from '../db.js';
import { asyncRouter } from '../http.js';
import { publicUser, requireAuth, signToken } from '../auth.js';
import { body, forgotSchema, loginSchema, resetSchema, signupSchema } from '../validate.js';

const router = asyncRouter();
const RESET_TTL_MIN = 30;

router.post('/signup', body(signupSchema), async (req, res) => {
  const { name, email, password } = req.body;
  if (await db.get('SELECT 1 AS x FROM users WHERE email = ?', email)) {
    return res.status(409).json({ error: 'An account with this email already exists', field: 'email' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', name, email, hash);
  const user = await db.get('SELECT * FROM users WHERE id = ?', lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', body(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
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
export async function createResetLink(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000).toISOString();
  await db.run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)', hash, userId, expires);
  return { url: `/reset-password?token=${token}`, expiresAt: expires };
}

router.post('/forgot', body(forgotSchema), async (req, res) => {
  const user = await db.get('SELECT id FROM users WHERE email = ?', req.body.email);
  const reply = { ok: true, message: "If that email has an account, we've created a reset link." };
  if (!user) return res.json(reply);

  const link = await createResetLink(user.id);
  // No email service is configured, so the link is logged for the operator and — in development only — returned.
  console.log(`[auth] Password reset link for ${req.body.email}: ${link.url}`);
  res.json(process.env.NODE_ENV === 'production' ? reply : { ...reply, devResetUrl: link.url });
});

router.post('/reset', body(resetSchema), async (req, res) => {
  const hash = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const row = await db.get('SELECT * FROM password_resets WHERE token_hash = ?', hash);
  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }
  await batch([
    ['UPDATE users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(req.body.password, 10), row.user_id],
    ['UPDATE password_resets SET used = 1 WHERE user_id = ?', row.user_id],
  ]);
  const user = await db.get('SELECT * FROM users WHERE id = ?', row.user_id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

export default router;
