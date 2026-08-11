// Must be the first import: ES modules evaluate imports before any statement,
// so config/auth.js (which requires JWT_SECRET at module scope) needs the .env
// file loaded before it runs. This loader resolves backend/.env absolutely so
// the app boots from any working directory.
import './config/bootstrap-env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import appConfig from './config/app.js';
import sequelize from './config/database.js';
import authConfig from './config/auth.js';
import publicRoutes from './routes/public.js';
import authenticatedRoutes from './routes/authenticated.js';
import LocalFileService from './services/media/LocalFileService.js';
import models from './models/index.js';
import { getTokenFromReq } from './services/cookie.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.VERCEL === '1' ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();

// Behind Vercel's proxy: trust the first hop so express-rate-limit keys on
// the real client IP instead of rejecting the X-Forwarded-For header.
app.set('trust proxy', 1);

app.use(cors({
  origin: appConfig.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later' },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const dbConnectionPromise = sequelize.authenticate().then(() => {
  console.log('Database connected');
  return models.SiteSetting.findOne({ where: { id: 1 } })
    .then(() => undefined)
    .catch(err => console.error('Failed to load site settings at boot:', err.message));
}).catch(err => {
  console.error('Database connection failed:', err.message);
});

app.use('/api', async (req, res, next) => {
  try {
    await dbConnectionPromise;
    next();
  } catch {
    res.status(503).json({ message: 'Database not ready, please try again' });
  }
});

// Before serving any /uploads file, check if it belongs to a study material
// and send Content-Disposition with the admin-provided title. Browsers use
// that filename for the PDF viewer tab title instead of the random stored name.
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|ico|avif|bmp)$/i;
app.use('/uploads', async (req, res, next) => {
  try {
    const match = req.path.match(/^\/([^/]+)\/([^/]+)$/);
    if (match && !IMAGE_EXT_RE.test(match[2])) {
      const filePath = `/uploads/${match[1]}/${match[2]}`;
      const material = await models.StudyMaterial.findOne({ where: { file_path: filePath } });
      if (material && material.title) {
        let name = String(material.title).trim().replace(/["\r\n]/g, '');
        if (name) {
          const ext = path.extname(match[2]);
          if (ext && !name.toLowerCase().endsWith(ext.toLowerCase())) {
            name += ext;
          }
          const ascii = name.replace(/[^\x20-\x7E]/g, '_');
          res.setHeader(
            'Content-Disposition',
            `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
          );
        }
      }
    }
  } catch {
    // Lookup failure must never break file serving
  }
  next();
});

// Student documents (NID scans, certificates, etc.) are private: only the
// owning student and admins may fetch them. Previously any anonymous visitor
// with a /uploads/students/... URL could download them.
app.use('/uploads', async (req, res, next) => {
  try {
    if (!req.path.startsWith('/students/')) return next();
    // <a href> navigation cannot send an Authorization header, so also accept
    // the JWT as a ?token= query parameter (used for student document links).
    const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
    // Bearer header first (backward compatible), then the HttpOnly auth cookie,
    // then the ?token= query parameter (for document links opened in a new tab
    // from an external source, where a header cannot be attached).
    const candidate = getTokenFromReq(req) || queryToken;
    let decoded = null;
    if (candidate) {
      try {
        decoded = jwt.verify(candidate, authConfig.jwtSecret);
      } catch {
        decoded = null;
      }
    }
    if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      res.setHeader('Cache-Control', 'private, no-store');
      return next();
    }
    if (decoded.role === 'student') {
      const fileName = path.basename(req.path);
      const filePath = `/uploads/students/${fileName}`;
      const doc = await models.StudentDocument.findOne({
        where: { file_path: filePath },
        include: [{ model: models.Student, attributes: ['user_id'] }],
      });
      if (doc?.Student?.user_id === decoded.id) {
        res.setHeader('Cache-Control', 'private, no-store');
        return next();
      }
      return res.status(403).json({ message: 'Forbidden' });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/uploads/:folder/:filename', (req, res, next) => LocalFileService.serve(req, res, next));
app.use('/storage', express.static(path.join(__dirname, 'public', 'storage')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// CDN-cache public GET responses (60s) so repeated page loads skip the
// serverless function entirely.
app.use('/api/public', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  next();
});

// Keep-alive endpoint for external uptime monitors (e.g. UptimeRobot).
// Neon's Free plan suspends the database compute after 5 minutes of
// inactivity; pinging this endpoint every few minutes prevents the ~2.5s
// "cold database" delay on the first request after idle.
app.get('/api/keep-alive', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await sequelize.query('SELECT 1');
    res.json({ ok: true, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use('/api', publicRoutes);
app.use('/api', authenticatedRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: appConfig.name, timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large' });
  }
  if (err.message?.includes('File type not allowed') || err.message?.includes('Only image files')) {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'RateLimitError') {
    return res.status(429).json({ message: 'Too many requests, please try again later' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

if (process.env.VERCEL !== '1') {
  app.listen(appConfig.port, () => {
    console.log(`${appConfig.name} API running on port ${appConfig.port}`);
  });
}

export default app;
