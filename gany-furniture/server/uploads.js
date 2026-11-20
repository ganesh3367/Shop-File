import crypto from 'node:crypto';
import multer from 'multer';
import { db } from './db.js';

// Uploads are kept in the database (files table) rather than on disk, so they survive on hosts
// like Render's free plan where the filesystem is wiped on every deploy and restart.

const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'model/gltf-binary': '.glb',
  'application/octet-stream': '.glb', // most browsers send .glb files with this type
};
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };

const make = (allowed, maxMB) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ok = allowed.includes(file.mimetype) && (!file.mimetype.includes('octet') || file.originalname.toLowerCase().endsWith('.glb'));
      cb(ok ? null : Object.assign(new Error('Unsupported file type'), { status: 400 }), ok);
    },
  });

export const imageUpload = make(['image/jpeg', 'image/png', 'image/webp'], 4);
export const modelUpload = make(['model/gltf-binary', 'application/octet-stream'], 10);

/** Store an uploaded file under a random name (never the user's) and return its public URL. */
export async function saveUpload(file) {
  if (!file) return null;
  const ext = EXT[file.mimetype];
  const name = crypto.randomBytes(12).toString('hex') + ext;
  await db.run('INSERT INTO files (name, mime, size, data) VALUES (?, ?, ?, ?)', name, MIME[ext], file.size, file.buffer);
  return `/uploads/${name}`;
}

/** GET /uploads/:name — serve a stored file. Names are random and never reused, so it can be cached for good. */
export async function serveUpload(req, res) {
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|glb)$/.test(req.params.name)) return res.status(404).json({ error: 'Not found' });
  const file = await db.get('SELECT mime, data FROM files WHERE name = ?', req.params.name);
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.set({ 'Content-Type': file.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(Buffer.from(file.data));
}
