import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import models from '../models/index.js';
import EmailService from './email/EmailService.js';
import { decryptSecret } from './secretCrypto.js';

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

function getDbMailConfig(row) {
  if (!row || !row.smtp_host) return null;
  return {
    host: row.smtp_host,
    port: String(row.smtp_port || 587),
    username: row.smtp_username || '',
    password: decryptSecret(row.smtp_password) || '',
    encryption: row.smtp_encryption || 'tls',
    fromAddress: row.smtp_from_address || row.email || 'noreply@uttoron.com',
    fromName: row.smtp_from_name || row.site_name || 'Uttoron Coaching Centre',
  };
}

// SMTP settings live in the SiteSetting row (admin-configurable). Env vars
// (MAIL_*) take precedence when set; otherwise fall back to the DB row so
// emails work on cold starts before any SiteSetting query has run.
export async function getSiteMailConfig() {
  const now = Date.now();
  if (siteMailCache.config && now - siteMailCache.at < CONFIG_CACHE_TTL_MS) {
    return siteMailCache.config;
  }

  let dbConfig = null;
  try {
    const settings = await models.SiteSetting.findOne({ where: { id: 1 } });
    dbConfig = getDbMailConfig(settings);
  } catch (err) {
    console.error('[mailer] Failed to load SMTP settings from DB:', err.message);
  }

  const dbFromCandidate = dbConfig?.fromAddress || 'noreply@uttoron.com';
  const fromCandidate = process.env.MAIL_FROM_ADDRESS || dbFromCandidate;

  // Gmail hard-fails SPF/DKIM alignment when the From address is a different
  // Gmail account than the authenticated SMTP user — the mail is accepted by
  // SMTP but silently sent to spam or dropped. Pinning the From to the
  // authenticated account keeps delivery working.
  let fromAddress = fromCandidate;
  const authUser = process.env.MAIL_USERNAME || dbConfig?.username || '';
  if (
    authUser &&
    /@(gmail\.com|googlemail\.com)$/i.test(authUser) &&
    /@(gmail\.com|googlemail\.com)$/i.test(fromAddress) &&
    fromAddress.toLowerCase() !== authUser.toLowerCase()
  ) {
    console.warn(`[mailer] From '${fromAddress}' differs from the authenticated Gmail account; using '${authUser}' for deliverability (SPF/DKIM).`);
    fromAddress = authUser;
  }

  const config = {
    host: process.env.MAIL_HOST || dbConfig?.host || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || dbConfig?.port || '587', 10),
    secure: (process.env.MAIL_ENCRYPTION || dbConfig?.encryption || 'tls') === 'ssl',
    auth: {
      user: process.env.MAIL_USERNAME || dbConfig?.username || '',
      pass: process.env.MAIL_PASSWORD || dbConfig?.password || '',
    },
    fromAddress,
    fromName: process.env.MAIL_FROM_NAME || dbConfig?.fromName || 'Uttoron Coaching Centre',
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
  // Primary path: the dynamic provider configured in the admin panel
  // (Brevo/Resend API key + sender). SMTP is only a fallback for setups
  // where the provider isn't configured but SMTP explicitly is.
  try {
    const cfg = await EmailService.getConfig();
    if (cfg.enabled && cfg.apiKey && cfg.from) {
      const result = await EmailService.sendRaw(to, { subject, text, html });
      if (result.skipped) {
        console.log('[mailer] Email skipped (provider not configured/enabled):', subject);
        return { messageId: null, error: 'Email sending is not configured. Set the sender and API key in Site Settings.' };
      }
      if (!result.ok) {
        console.error('[mailer] Email provider rejected:', result.raw || result.error);
        return { messageId: null, error: result.raw || result.error };
      }
      let messageId = 'sent';
      try {
        messageId = JSON.parse(result.raw || '{}').messageId || 'sent';
      } catch (e) { /* keep default */ }
      console.log('[mailer] Email sent via provider:', messageId);
      return { messageId };
    }
  } catch (error) {
    console.error('[mailer] Provider config lookup failed:', error.message);
  }

  // Fallback: explicit SMTP (MAIL_* env vars or SMTP fields in Site Settings).
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
  if (appUrl) {
    return appUrl.replace(/\/+$/, '');
  }

  return 'http://localhost:8000';
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
