import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import models from '../models/index.js';

const CONFIG_CACHE_TTL_MS = 60 * 1000;

let siteMailCache = { at: 0, config: null };
let transportCache = null;
let transportCacheKey = '';

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyEnvFromSettings(row) {
  if (!row || !row.smtp_host) return;
  process.env.MAIL_HOST = row.smtp_host;
  process.env.MAIL_PORT = String(row.smtp_port || 587);
  process.env.MAIL_USERNAME = row.smtp_username || '';
  process.env.MAIL_PASSWORD = row.smtp_password || '';
  process.env.MAIL_ENCRYPTION = row.smtp_encryption || 'tls';
  process.env.MAIL_FROM_ADDRESS = row.smtp_from_address || row.email || 'noreply@uttoron.com';
  process.env.MAIL_FROM_NAME = row.smtp_from_name || row.site_name || 'Uttoron Coaching Centre';
}

// SMTP settings live in the SiteSetting row (admin-configurable). Env vars
// (MAIL_*) take precedence when set; otherwise fall back to the DB row so
// emails work on cold starts before any SiteSetting query has run.
export async function getSiteMailConfig() {
  const now = Date.now();
  if (siteMailCache.config && now - siteMailCache.at < CONFIG_CACHE_TTL_MS) {
    return siteMailCache.config;
  }

  let settings = null;
  try {
    settings = await models.SiteSetting.findOne({ where: { id: 1 } });
  } catch (err) {
    console.error('[mailer] Failed to load SMTP settings from DB:', err.message);
  }
  if (settings) applyEnvFromSettings(settings);

  const config = {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: (process.env.MAIL_ENCRYPTION || 'tls') === 'ssl',
    auth: {
      user: process.env.MAIL_USERNAME || '',
      pass: process.env.MAIL_PASSWORD || '',
    },
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@uttoron.com',
    fromName: process.env.MAIL_FROM_NAME || 'Uttoron Coaching Centre',
  };

  siteMailCache = { at: now, config };
  return config;
}

export function resetMailConfigCache() {
  siteMailCache = { at: 0, config: null };
  transportCache = null;
  transportCacheKey = '';
}

// Resolve the intended recipients for public-form admin notifications
// (admission applications, contact messages, ...).
// Preference order:
//  1. An admin-configured SiteSetting field (e.g. `admission_email`,
//     `messages_email`) — explicitly configured recipients are always honored.
//  2. Active admin/super_admin users.
export async function resolveAdminRecipients(settingField) {
  const setting = await models.SiteSetting.findByPk(1, {
    attributes: [settingField],
  });
  if (setting && setting[settingField]) {
    return String(setting[settingField])
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }
  const admins = await models.User.findAll({
    where: { role: ['admin', 'super_admin'], is_active: true },
    attributes: ['email'],
  });
  return admins
    .map((u) => u.email)
    .filter(Boolean);
}

const transportKeyOf = (c) => [c.host, c.port, c.secure, c.auth.user, c.auth.pass].join('|');

export async function getTransport() {
  const config = await getSiteMailConfig();
  const key = transportKeyOf(config);
  if (transportCache && transportCacheKey === key) return transportCache;
  transportCache = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.auth.user, pass: config.auth.pass },
  });
  transportCacheKey = key;
  return transportCache;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const config = await getSiteMailConfig();
    const transport = await getTransport();
    const info = await transport.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to,
      subject,
      html,
      text,
    });
    console.log('[mailer] Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('[mailer] Email sending failed:', error.message);
    return { messageId: null, error: error.message };
  }
}

// The API and the frontend live on the same Vercel deployment, so the action
// links point at the API route on whatever host is serving the app.
// The action links are followed from the recipient's browser, so they must
// point at the public production URL of the deployment, never the internal
// backend APP_URL (which is commonly http://localhost:8000 in .env). On Vercel
// the runtime injects VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL, so prefer those.
export function resolveSiteBaseUrl() {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_BRANCH_URL;
  if (vercelHost) return `https://${vercelHost}`;

  const appUrl = process.env.APP_URL;
  if (appUrl && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(appUrl)) {
    return appUrl.replace(/\/+$/, '');
  }

  return 'https://uttoron-coaching.vercel.app';
}

// Signed, short-lived, action-bound tokens: only an admin who received the
// email can act, only on the admission the email was about, and the link
// expires after 72 hours.
function signAdmissionAction(admissionId, action) {
  return jwt.sign({ admissionId, action }, authConfig.jwtSecret, { expiresIn: '72h' });
}

export function buildAdminActionLinks(admissionId) {
  const base = resolveSiteBaseUrl();
  const linkFor = (action) =>
    `${base}/api/public/admissions/action?action=${action}&token=${encodeURIComponent(signAdmissionAction(admissionId, action))}`;
  return {
    base,
    approveUrl: linkFor('approve'),
    rejectUrl: linkFor('reject'),
    holdUrl: linkFor('hold'),
  };
}
