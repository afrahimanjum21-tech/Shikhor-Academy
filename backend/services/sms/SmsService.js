import models from '../../models/index.js';
import { Op } from 'sequelize';
import { stripEmojis, truncateSms } from './smsEncoding.js';

const TIMEOUT_MS = 8000;

const log = (msg) => console.log(`[SmsService] ${msg}`);

// D8: resolve config PER CALL (not frozen at module import) so an env change —
// or a future admin toggle — takes effect without a process restart. The
// classic SSL Wireless endpoint is a LEGACY API that requires user/pass in the
// query string; we therefore NEVER log the request URL (only the response), so
// those credentials cannot leak into logs. Documented limitation: upgrade to
// the SMS Plus v3 endpoint (bearer api_token, JSON body) to avoid query creds.
function getSmsConfig() {
  const apiUrl = process.env.SMS_API_URL || 'https://sms.sslwireless.com/pushapi/dynamic/server.php';
  return {
    enabled: process.env.SMS_ENABLED === 'true',
    apiUrl,
    apiUser: process.env.SMS_API_USER,
    apiPass: process.env.SMS_API_PASS,
    apiToken: process.env.SMS_API_TOKEN,
    senderId: process.env.SMS_SENDER_ID || 'SHIKHOR',
    isSmsPlus: /smsplus/i.test(apiUrl),
  };
}

// Normalizes a Bangladeshi mobile number to 8801XXXXXXXXX (E.164), or null if invalid.
export function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/\D/g, '');
  if (p.startsWith('880')) p = p.slice(3);
  else if (p.startsWith('88')) p = p.slice(2);
  if (p.startsWith('0')) p = p.slice(1);
  return /^1[3-9]\d{8}$/.test(p) ? `880${p}` : null;
}

async function sendOne(msisdn, message) {
  const to = normalizePhone(msisdn);
  if (!to) {
    log(`skipped (invalid number): ${msisdn}`);
    return { ok: false, skipped: true };
  }

  const cfg = getSmsConfig();

  if (!cfg.enabled) {
    log(`disabled — would send to ${to}: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`);
    return { ok: true, skipped: true };
  }

  // D8: encoding-aware, grapheme-safe truncation (never splits a Bangla cluster
  // or a surrogate pair; UCS-2 = 70 chars, GSM-7 = 160).
  const sms = truncateSms(stripEmojis(message));
  const csmsId = `shikhor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res;
    if (cfg.isSmsPlus) {
      if (!cfg.apiToken) {
        log(`skipped (SMS_API_TOKEN missing for SMS Plus endpoint)`);
        return { ok: false, skipped: true };
      }
      res = await fetch(cfg.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: cfg.apiToken, sid: cfg.senderId, msisdn: to, sms, csms_id: csmsId }),
        signal: controller.signal,
      });
    } else {
      if (!cfg.apiUser || !cfg.apiPass) {
        log(`skipped (SMS_API_USER/SMS_API_PASS missing)`);
        return { ok: false, skipped: true };
      }
      const params = new URLSearchParams({
        user: cfg.apiUser,
        pass: cfg.apiPass,
        sid: cfg.senderId,
        sms,
        msisdn: to,
        csms_id: csmsId,
      });
      // NOTE: legacy endpoint carries creds in the query string — the request
      // URL is deliberately NOT logged anywhere (only the response below).
      res = await fetch(`${cfg.apiUrl}?${params.toString()}`, { method: 'POST', signal: controller.signal });
    }

    const raw = await res.text();
    log(`sent to ${to}: HTTP ${res.status} — ${raw.slice(0, 150)}`);
    return { ok: res.ok, raw };
  } catch (err) {
    log(`failed for ${to}: ${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Composes the SMS text from the in-app notification payload (title + body,
// emoji-free, encoding-aware grapheme-safe truncation).
export function composeMessage(title, body) {
  const raw = `Shikhor Academy: ${title}: ${body}`;
  return truncateSms(stripEmojis(raw));
}

// Sends one SMS to a single user id (looks up their phone).
export async function sendToUser(userId, message) {
  if (!userId) return { ok: false, skipped: true };
  const user = await models.User.findByPk(userId, { attributes: ['phone'] });
  if (!user?.phone) {
    log(`skipped (no phone on user ${userId})`);
    return { ok: false, skipped: true };
  }
  return sendOne(user.phone, message);
}

// Sends one SMS per user id. Phone lookup is batched; each send is isolated
// (allSettled) so one bad number never aborts the rest.
export async function sendToUsers(userIds, message) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return [];

  const users = await models.User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'phone'],
  });

  const results = await Promise.allSettled(
    users.map(u => (u.phone ? sendOne(u.phone, message) : Promise.resolve({ ok: false, skipped: true })))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value?.ok && !r.value?.skipped).length;
  if (sent > 0) log(`delivered ${sent}/${users.length} SMS`);
  return results.map(r => (r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message }));
}

export default { sendToUser, sendToUsers, composeMessage, normalizePhone };