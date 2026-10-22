import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ensureAdmin } from './db.js';
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const isProd = process.env.NODE_ENV === 'production';

ensureAdmin();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // Framer Motion animates via inline style attributes.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://audocph.com', 'https://us.audocph.com', 'https://presscloud.com'],
        mediaSrc: ["'self'"],
        frameSrc: ['https://www.google.com'],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.json({ limit: '100kb' }));

// Throttle the endpoints people could abuse.
const limit = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again shortly' },
  });
app.use('/api/auth', limit(30));
app.use(['/api/messages', '/api/subscribers'], limit(20));
app.use('/api/orders', limit(60));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', storeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// In production the same server also serves the built React app.
const dist = path.resolve('dist');
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Last-resort error handler: log the details, return a generic message.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
