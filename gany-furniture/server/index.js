import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import { ensureAdmin } from './db.js';
import { UPLOAD_DIR } from './uploads.js';
import { openapi } from './openapi.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import storeRoutes from './routes/store.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const isProd = process.env.NODE_ENV === 'production';

ensureAdmin();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const csp = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  // Framer Motion animates via inline style attributes.
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://audocph.com', 'https://us.audocph.com', 'https://presscloud.com'],
  mediaSrc: ["'self'"],
  frameSrc: ['https://www.google.com'],
  // The 3D viewer loads models with fetch and decodes textures in blob: workers.
  connectSrc: ["'self'", 'blob:', 'data:'],
  workerSrc: ["'self'", 'blob:'],
};

// Swagger UI ships its own inline scripts, so only the docs page gets a looser script policy.
const siteHelmet = helmet({ contentSecurityPolicy: { directives: csp } });
const docsHelmet = helmet({ contentSecurityPolicy: { directives: { ...csp, scriptSrc: ["'self'", "'unsafe-inline'"] } } });
app.use((req, res, next) => (req.path.startsWith('/api/docs') ? docsHelmet : siteHelmet)(req, res, next));
app.use(express.json({ limit: '200kb' }));

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
app.use(['/api/auth/forgot', '/api/auth/reset'], limit(8));
app.use(['/api/messages', '/api/subscribers'], limit(20));
app.use('/api/orders', limit(60));
app.use('/api/coupons', limit(40));
app.post('/api/products/:id/reviews', limit(10));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Gany's API" }));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', storeRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Uploaded product images, review photos and 3D models.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', fallthrough: false }));

// In production the same server also serves the built React app.
const dist = path.resolve('dist');
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Last-resort error handler: friendly messages for known problems, generic for the rest.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large' : 'Upload failed';
    return res.status(400).json({ error: msg });
  }
  if (err.status === 400 || err.status === 404) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
