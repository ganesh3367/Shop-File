import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { publicUser, requireAuth, signToken } from '../auth.js';
import { body, loginSchema, signupSchema } from '../validate.js';

const router = Router();

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

export default router;
