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
import integrationRoutes from './routes/integrations.js';
import LocalFileService from './services/media/LocalFileService.js';
import models from './models/index.js';
import { getTokenFromReq } from './services/cookie.js';
import { resolveStudentAccess } from './services/accessControl.js';
import { decideMaterialAccess, decideSubmissionAccess, decideAssignmentAttachmentAccess, shouldLookupMaterial } from './services/protectedFileAccess.js';
import { verifyDownloadToken } from './services/downloadToken.js';
import { isPersonalizedPublicPath } from './services/cachePolicy.js';
import securityHeaders from './middleware/securityHeaders.js';
import { csrfProtection } from './middleware/csrf.js';
import { rateLimitStoreEnabled } from './services/rateLimitStore.js';

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

// Baseline security headers (nosniff, Referrer-Policy, clickjacking, API CSP).
app.use(securityHeaders);

// C24: express-rate-limit uses an in-process MemoryStore by default. On Vercel
// each serverless isolate has its own memory, so counters are per-isolate, NOT
// global. The abuse-sensitive endpoints (login / admission / contact /
// set-password, in routes/public.js) use a shared Postgres-backed store
// (services/rateLimitStore.js, table from migration 016) so THOSE limits are
// global across isolates; it is OPT-IN via RATE_LIMIT_STORE=postgres. The
// coarse global limiter below deliberately stays on the in-memory store — a
// per-isolate cap is fine for broad DoS smoothing and avoids a DB write on
// every single request.
if (process.env.VERCEL === '1' && !rateLimitStoreEnabled()) {
  console.warn('[rate-limit] Using in-memory store on Vercel: login/admission/contact limits are per-isolate, not global. Set RATE_LIMIT_STORE=postgres (after running migration 016) for a shared, distributed limit on those endpoints.');
}
const createLimiter = (options) => rateLimit(options);

const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later' },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

// J (H-low11): CSRF double-submit guard for cookie-authenticated mutations.
// No-op for safe methods, Bearer-authenticated API calls, and unauthenticated
// public/callback posts (see middleware/csrf.js).
app.use(csrfProtection);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// D18: the boot DB connection is tracked by an explicit readiness flag. The
// previous `.catch` swallowed the failure so the promise RESOLVED and the
// `/api` 503 branch below was unreachable (requests proceeded against a dead
// DB). Now a failure is recorded (safe diagnostic only — never the connection
// string) and the readiness check is truthful.
let dbReady = false;
const dbConnectionPromise = sequelize.authenticate().then(async () => {
  dbReady = true;
  console.log('Database connected');
  try {
    await models.SiteSetting.findOne({ where: { id: 1 } });
  } catch (err) {
    console.error('Failed to load site settings at boot:', err.message);
  }
}).catch((err) => {
  dbReady = false;
  console.error('Database connection failed:', err.message);
});

app.use('/api', async (req, res, next) => {
  await dbConnectionPromise; // settles once; later awaits resolve instantly
  if (!dbReady) {
    return res.status(503).json({ message: 'Database not ready, please try again' });
  }
  next();
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
    const resourcePath = `/uploads${req.path}`;

    // <a href>/<img src> cannot send an Authorization header. Instead of the
    // old long-lived session JWT in ?token= (leaks for 30 days via history/
    // logs/referrer), accept a SHORT-LIVED signed download token scoped to this
    // exact file (minted by the server only after an ownership check). Posession
    // of a valid, unexpired, correctly-scoped token authorizes this one file.
    const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
    if (queryToken && verifyDownloadToken(queryToken, resourcePath)) {
      res.setHeader('Cache-Control', 'private, no-store');
      return next();
    }

    // Same-origin API/XHR still authenticates with the session JWT via the
    // HttpOnly cookie or Bearer header (NOT the URL).
    const candidate = getTokenFromReq(req);
    let decoded = null;
    if (candidate) {
      try {
        decoded = jwt.verify(candidate, authConfig.jwtSecret, { algorithms: [authConfig.jwtAlgorithm] });
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

// Authorize PROTECTED downloads at the FILE layer (not just by hiding the URL in
// listing JSON): restricted study materials (access_type batch/course/class),
// student assignment submissions, and teacher assignment attachments. Public
// ('all') materials, non-general images/thumbnails, and files not backed by a
// managed record are served unchanged. Identifies the viewer via the session
// JWT in the Bearer header or HttpOnly cookie, or authorizes a single file via a
// short-lived signed download token in ?token= (NOT the session JWT).
app.use('/uploads', async (req, res, next) => {
  try {
    const m = req.path.match(/^\/([^/]+)\/([^/]+)$/);
    if (!m) return next();
    const folder = m[1];
    const filename = m[2];
    if (folder === 'students') return next(); // already handled by the gate above

    const filePath = `/uploads/${folder}/${filename}`;

    // Signed, file-scoped download token (short-lived) authorizes this exact
    // file — minted server-side only after an access check. Replaces the old
    // long-lived session JWT in ?token=.
    const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
    if (queryToken && verifyDownloadToken(queryToken, filePath)) {
      res.setHeader('Cache-Control', 'private, no-store');
      return next();
    }

    // Same-origin requests still identify the viewer by the session JWT in the
    // HttpOnly cookie / Bearer header (never the URL).
    const candidate = getTokenFromReq(req);
    let viewer = null;
    if (candidate) {
      try { viewer = jwt.verify(candidate, authConfig.jwtSecret, { algorithms: [authConfig.jwtAlgorithm] }); }
      catch { viewer = null; }
    }

    let decision;
    if (folder === 'assignments') {
      // Student submissions live here (teacher attachments live in `general`).
      const submission = await models.AssignmentSubmission.findOne({
        where: { submission_file_path: filePath },
        include: [{ model: models.Student, attributes: ['user_id'] }],
      });
      decision = decideSubmissionAccess(submission, viewer);
    } else {
      // Restricted study materials live in `general` and MUST be checked even
      // with an image extension (H-low10); other folders' images skip for speed.
      if (!shouldLookupMaterial(folder, filename)) return next();
      const student = (viewer && viewer.role === 'student') ? await resolveStudentAccess(req) : null;
      const material = await models.StudyMaterial.findOne({ where: { file_path: filePath } });
      if (material) {
        decision = decideMaterialAccess(material, viewer, student);
      } else {
        // Not a study material — teacher assignment attachments are ALSO stored
        // in `general` (uploaded via MediaService folder 'general'), so gate
        // them by Assignment ownership/enrolment (C12). A file backed by neither
        // record stays public/legacy.
        const assignment = await models.Assignment.findOne({ where: { attachment_path: filePath } });
        decision = decideAssignmentAttachmentAccess(assignment, viewer, student);
      }
    }

    if (decision === 'public') return next();
    if (decision === 'allow') { res.setHeader('Cache-Control', 'private, no-store'); return next(); }
    if (decision === 'unauth') return res.status(401).json({ message: 'Unauthorized' });
    return res.status(403).json({ message: 'Forbidden' });
  } catch {
    // Fail closed on an authorization error (same posture as the student-docs gate).
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/uploads/:folder/:filename', (req, res, next) => LocalFileService.serve(req, res, next));
app.use('/storage', express.static(path.join(__dirname, 'public', 'storage')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// CDN-cache public GET responses (60s browser, 60s edge) so repeated page
// loads skip the serverless function entirely; the frontend also keeps its
// own short-lived client cache so navigation stays instant even when the
// edge copy has expired. PERSONALIZED endpoints (per-viewer is_unlocked /
// nulled locked URLs) are excluded — they must never be shared-cached, or one
// student's response could be served to another (C15).
app.use('/api/public', (req, res, next) => {
  if (req.method === 'GET') {
    if (isPersonalizedPublicPath(req.path)) {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Vary', 'Authorization, Cookie');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      res.setHeader('Vary', 'Accept-Encoding');
    }
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
app.use('/api', integrationRoutes);
app.use('/api', authenticatedRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: appConfig.name, timestamp: new Date().toISOString() });
});

// XML sitemap for search engines. Static public pages plus all active
// courses; falls back to static pages only if the DB is unavailable.
app.get('/sitemap.xml', async (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  // H-low9: the canonical site URL follows the configured deployment origin
  // (SITE_URL / FRONTEND_URL) instead of a hardcoded host, so the sitemap stays
  // correct if the public domain changes or the frontend deploys separately.
  const base = (process.env.SITE_URL || process.env.FRONTEND_URL || 'https://www.shikhoracademy.me').replace(/\/+$/, '');
  const staticPaths = [
    { path: '', priority: '1.0', freq: 'daily' },
    { path: '/about', priority: '0.8', freq: 'monthly' },
    { path: '/courses', priority: '0.9', freq: 'daily' },
    { path: '/faculty', priority: '0.7', freq: 'monthly' },
    { path: '/gallery', priority: '0.5', freq: 'monthly' },
    { path: '/notices', priority: '0.8', freq: 'weekly' },
    { path: '/success-stories', priority: '0.7', freq: 'weekly' },
    { path: '/contact', priority: '0.6', freq: 'monthly' },
    { path: '/admission', priority: '0.9', freq: 'monthly' },
    { path: '/library', priority: '0.5', freq: 'monthly' },
  ];
  const entries = [...staticPaths];
  try {
    const courses = await models.Course.findAll({
      where: { is_active: true },
      attributes: ['slug', 'updatedAt'],
    });
    for (const course of courses) {
      entries.push({
        path: `/course/${course.slug}`,
        priority: '0.8',
        freq: 'weekly',
        lastmod: course.updatedAt ? course.updatedAt.toISOString().slice(0, 10) : undefined,
      });
    }
  } catch (err) {
    console.error('Sitemap course fetch failed:', err.message);
  }
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n      <lastmod>${e.lastmod}</lastmod>` : '';
      return `  <url>
      <loc>${base}${e.path}</loc>${lastmod}
      <changefreq>${e.freq}</changefreq>
      <priority>${e.priority}</priority>
    </url>`;
    })
    .join('\n');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
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
