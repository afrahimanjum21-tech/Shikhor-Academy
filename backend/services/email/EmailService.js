import models from '../../models/index.js';
import { Op } from 'sequelize';
import { decryptSecret } from '../secretCrypto.js';

/**
 * Transactional email service (free-tier friendly).
 *
 * Fail-safe by design (same as SmsService): unless enabled and a provider key
 * is set, every call logs and returns without touching the network, so
 * admission/payment/result flows can never break because of email.
 *
 * Configuration is DYNAMIC (admin-editable): it is read from the SiteSettings
 * row (id 1, editable in the admin panel — columns email_enabled,
 * email_provider, email_api_key, email_from) and cached briefly. The env vars
 * below are only the bootstrap fallback used until the admin saves settings:
 *
 * Env vars (fallback only):
 *   EMAIL_ENABLED      'true' to activate (default: off)
 *   EMAIL_PROVIDER     'brevo' (default) or 'resend'
 *   BREVO_API_KEY      Brevo v3 API key  (free tier: 300 emails/day,
 *                      sender email verified by click-link — no domain DNS)
 *   RESEND_API_KEY     Resend API key    (free tier: 100 emails/day,
 *                      requires a verified domain)
 *   EMAIL_FROM         "Name <email>" of the verified sender
 *   EMAIL_ENABLED_TYPES  comma-separated notification types that also email
 *                      (default: exam,payment,notice,material,assignment)
 */

const TIMEOUT_MS = 8000;
const CONFIG_TTL_MS = 15_000;
const DEFAULT_SENDER_NAME = 'Shikhor Academy';

let configCache = null;
let configCacheAt = 0;

const log = (msg) => console.log(`[EmailService] ${msg}`);
const configuredString = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized && !['null', 'undefined'].includes(normalized.toLowerCase()) ? normalized : '';
};

// Clears the cached config (called by SiteSettingController after an update).
export function resetEmailConfigCache() {
  configCache = null;
}

// Resolves the effective email config. DB settings (admin panel) take
// precedence; env vars are the bootstrap fallback while the columns are null.
export async function getConfig() {
  const now = Date.now();
  if (configCache && now - configCacheAt < CONFIG_TTL_MS) return configCache;

  let row = null;
  try {
    row = await models.SiteSetting.instance();
  } catch (err) {
    log(`config lookup failed: ${err.message}`);
  }
  const s = row && row.toJSON ? row.toJSON() : {};

  const provider = (configuredString(s.email_provider) || configuredString(process.env.EMAIL_PROVIDER) || 'brevo').toLowerCase();
  const dbKey = configuredString(decryptSecret(s.email_api_key));
  const envKey = provider === 'resend' ? process.env.RESEND_API_KEY : process.env.BREVO_API_KEY;

  const cfg = {
    enabled: typeof s.email_enabled === 'boolean' ? s.email_enabled : process.env.EMAIL_ENABLED === 'true',
    provider,
    apiKey: dbKey || envKey || '',
    from: configuredString(s.email_from) || configuredString(process.env.EMAIL_FROM),
  };

  configCache = cfg;
  configCacheAt = now;
  return cfg;
}

// Parses "Name <email@example.com>" into { name, email }. Falls back to
// treating the whole string as the address.
function parseFrom(raw) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(raw || '');
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: (raw || '').trim() };
}

function isUsableEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
}

// D9: escape every dynamic value before putting it in the HTML body, and only
// accept http(s)/site-relative action URLs — so notification text (which can
// include student-provided content like a leave reason) renders as TEXT, never
// as markup, and an `href` can never carry a javascript:/data: scheme.
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeActionUrl(url) {
  const u = String(url == null ? '' : url).trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;        // absolute http(s)
  if (/^\/[^/]/.test(u) || u === '/') return u; // site-relative ("/student/..."), not "//host"
  return '';                                     // reject javascript:, data:, mailto:, protocol-relative, etc.
}

// Composes the subject + plain-text + HTML body from the in-app payload.
export function composeEmail({ title, body, actionUrl, actionLabel }) {
  const subject = `Shikhor Academy: ${title}`;
  const url = safeActionUrl(actionUrl);
  const text = [
    'Shikhor Academy',
    '',
    body || '',
    '',
    actionLabel && url ? `${actionLabel}: ${url}` : '',
    actionLabel && !url ? actionLabel : '',
    '',
    'This is an automated message — please do not reply.',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1F4E79;padding:16px 24px">
        <span style="color:#ffffff;font-weight:bold;font-size:16px">Shikhor Academy</span>
      </div>
      <div style="padding:24px">
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">${escapeHtml(body)}</p>
        ${actionLabel && url ? `<a href="${escapeHtml(url)}" style="display:inline-block;background:#1F4E79;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 22px;border-radius:8px">${escapeHtml(actionLabel)}</a>` : ''}
      </div>
      <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">This is an automated message — please do not reply.</p>
      </div>
    </div>`;

  return { subject, text, html };
}

async function sendOne(config, toEmail, { subject, text, html }) {
  // Accepts a single address, a comma-separated string (legacy callers join
  // recipients like that), or an array of addresses.
  const toList = (Array.isArray(toEmail) ? toEmail : String(toEmail || '').split(','))
    .map(t => String(t || '').trim())
    .filter(isUsableEmail);

  if (toList.length === 0) {
    log(`skipped (invalid email): ${toEmail}`);
    return { ok: false, skipped: true };
  }

  if (!config.enabled) {
    log(`disabled — would email ${toList.join(', ')}: "${subject}"`);
    return { ok: true, skipped: true };
  }

  const from = parseFrom(config.from);
  if (!from.email) {
    log('skipped (sender email not set)');
    return { ok: false, skipped: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res;
    if (config.provider === 'resend') {
      if (!config.apiKey) {
        log('skipped (API key missing)');
        return { ok: false, skipped: true };
      }
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.from,
          to: toList,
          subject,
          ...(text ? { text } : {}),
          ...(html ? { html } : {}),
        }),
        signal: controller.signal,
      });
    } else {
      // Brevo (default) — it rejects empty textContent/htmlContent, so only
      // include the parts that are actually present (at least one is required).
      if (!config.apiKey) {
        log('skipped (API key missing)');
        return { ok: false, skipped: true };
      }
      const brevoBody = {
        sender: { name: from.name || DEFAULT_SENDER_NAME, email: from.email },
        to: toList.map(email => ({ email })),
        subject,
      };
      if (text) brevoBody.textContent = text;
      if (html) brevoBody.htmlContent = html;
      res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brevoBody),
        signal: controller.signal,
      });
    }

    const raw = await res.text();
    log(`sent to ${toList.join(', ')}: HTTP ${res.status} — ${raw.slice(0, 150)}`);
    return { ok: res.ok, raw };
  } catch (err) {
    log(`failed for ${toList.join(', ')}: ${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Sends a raw email (arbitrary subject/body) to one or more addresses using
// the current dynamic config. This is the bridge used by the legacy flows
// (admission applications, contact messages, credential change) via mailer.js,
// so every email on the site shares the admin-configured provider.
export async function sendRaw(toEmail, { subject, text = '', html = '' }) {
  const config = await getConfig();
  return sendOne(config, toEmail, { subject, text, html });
}

// Sends one email to a single user id (looks up their address).
export async function sendToUser(userId, payload) {
  if (!userId) return { ok: false, skipped: true };
  const user = await models.User.findByPk(userId, { attributes: ['email'] });
  if (!user?.email) {
    log(`skipped (no email on user ${userId})`);
    return { ok: false, skipped: true };
  }
  const config = await getConfig();
  return sendOne(config, user.email, composeEmail(payload));
}

// Sends one email per user id. Email lookup is batched; each send is isolated
// (allSettled) so one bad address never aborts the rest.
export async function sendToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return [];

  const config = await getConfig();
  const users = await models.User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'email'],
  });

  const email = composeEmail(payload);
  const results = await Promise.allSettled(
    users.map(u => (u.email ? sendOne(config, u.email, email) : Promise.resolve({ ok: false, skipped: true })))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value?.ok && !r.value?.skipped).length;
  if (sent > 0) log(`delivered ${sent}/${users.length} emails`);
  return results.map(r => (r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message }));
}

// Sends a one-off test email to an arbitrary address (admin panel "Send test
// email" button). Uses the current config, so it exercises the same path as
// real broadcasts.
export async function sendTest(toEmail) {
  const config = await getConfig();
  const email = composeEmail({
    title: 'Test email',
    body: 'This is a test email from the Shikhor Academy website. If you received this, the email notification system is working correctly.',
    actionLabel: 'Visit Website',
    actionUrl: process.env.FRONTEND_URL || 'https://www.shikhoracademy.me',
  });
  return sendOne(config, String(toEmail || '').trim(), email);
}

export default { sendToUser, sendToUsers, sendTest, sendRaw, getConfig, composeEmail, resetEmailConfigCache };