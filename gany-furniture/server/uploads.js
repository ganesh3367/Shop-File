import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'model/gltf-binary': '.glb',
  'application/octet-stream': '.glb', // most browsers send .glb files with this type
};

// Random file names: never trust (or expose) the uploaded name.
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
});

const make = (allowed, maxMB) =>
  multer({
    storage,
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ok = allowed.includes(file.mimetype) && (!file.mimetype.includes('octet') || file.originalname.toLowerCase().endsWith('.glb'));
      cb(ok ? null : Object.assign(new Error('Unsupported file type'), { status: 400 }), ok);
    },
  });

export const imageUpload = make(['image/jpeg', 'image/png', 'image/webp'], 4);
export const modelUpload = make(['model/gltf-binary', 'application/octet-stream'], 25);

export const publicPath = (file) => (file ? `/uploads/${file.filename}` : null);
