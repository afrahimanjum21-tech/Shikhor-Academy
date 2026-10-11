#!/usr/bin/env node
/**
 * staging-preflight.mjs — SAFE-BY-DEFAULT staging DB classifier & verifier.
 *
 * Default (no flags): PREFLIGHT ONLY — classifies the configured target from
 *   process.env and makes NO database connection:
 *     node scripts/staging-preflight.mjs
 * With --connect: after the SAME gates pass, performs a READ-ONLY check
 *   (migration status + per-table row COUNTS). Never reads row contents, never
 *   writes:
 *     node scripts/staging-preflight.mjs --connect
 *
 * Fail-closed model (ALL required to proceed):
 *   1. DATABASE_URL present and parseable.
 *   2. STAGING_OK=1 — explicit human acknowledgement this is a staging target.
 *   3. Host NOT in PRODUCTION_DB_HOSTS (comma-separated denylist).
 *   --connect ALSO requires a non-empty PRODUCTION_DB_HOSTS (so a real denylist
 *   exists); otherwise connecting is refused (classification is acknowledged-only).
 *
 * It deliberately does NOT load backend/.env (which holds PRODUCTION values).
 * Provide the STAGING config via the environment, e.g. (PowerShell):
 *   $env:DATABASE_URL="<staging>"; $env:STAGING_OK="1"; $env:PRODUCTION_DB_HOSTS="<prod-host>"
 *
 * Never prints the URL, password, key, row contents, or PII; the host is masked.
 * Exit 0 = all executed checks passed; non-zero = failed/refused.
 */
import process from 'node:process';

const WANT_CONNECT = process.argv.slice(2).includes('--connect');
const results = [];
const pass = (label, detail = '') => results.push({ ok: true, label, detail });
const fail = (label, detail = '') => results.push({ ok: false, label, detail });

function maskHost(host) {
  if (!host) return '(none)';
  const parts = host.split('.');
  if (parts.length <= 2) return `***.${parts.slice(-1)[0] || ''}`;
  return `***(${parts.slice(0, -3).join('.').length}).${parts.slice(-3).join('.')}`;
}
function parseUrl(raw) {
  try { const u = new URL(raw); return { host: u.hostname, db: (u.pathname || '').replace(/^\//, '') }; }
  catch { return null; }
}
function report() {
  console.log(`\nStaging preflight${WANT_CONNECT ? ' + connectivity' : ''}:`);
  for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
}

const rawUrl = (process.env.DATABASE_URL || '').trim();
if (!rawUrl) { fail('DATABASE_URL present', 'not set — refusing (fail closed)'); report(); process.exit(2); }
const target = parseUrl(rawUrl);
if (!target || !target.host) { fail('DATABASE_URL parseable', 'no host — refusing'); report(); process.exit(2); }
pass('DATABASE_URL present + parseable', `host=${maskHost(target.host)} db=${target.db ? '[set]' : '[none]'}`);

if (process.env.STAGING_OK === '1') pass('STAGING_OK acknowledgement', 'confirmed');
else fail('STAGING_OK=1 acknowledgement', 'not set — refusing (fail closed)');

const denylist = (process.env.PRODUCTION_DB_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const hostLc = target.host.toLowerCase();
const inDeny = denylist.some(h => hostLc === h || hostLc.endsWith('.' + h));
if (inDeny) fail('production denylist', 'target matches PRODUCTION_DB_HOSTS — REFUSING');
else if (denylist.length === 0) pass('production denylist', 'WARNING: PRODUCTION_DB_HOSTS empty (acknowledged-only classification)');
else pass('production denylist', 'target not in denylist');

const gatesOk = process.env.STAGING_OK === '1' && !inDeny && !!target.host;

async function connectVerify() {
  if (denylist.length === 0) { fail('--connect blocked', 'set PRODUCTION_DB_HOSTS before connecting — refusing'); return; }
  const { Sequelize } = await import('sequelize');
  const sq = new Sequelize(rawUrl, { dialect: 'postgres', logging: false, dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } });
  try {
    await sq.authenticate();
    pass('db connectivity (read-only)', 'authenticated');
    const [mig] = await sq.query('SELECT name FROM migrations_meta ORDER BY name ASC');
    pass('migrations applied', `${mig.length} recorded${mig.length ? ', latest ' + mig[mig.length - 1].name : ''}`);
    for (const t of ['Users', 'Students', 'Courses', 'Batches', 'AdmissionApplications', 'SiteSettings', 'PaymentSettings', 'PendingCredentialChanges']) {
      try { const [[row]] = await sq.query(`SELECT count(*)::int AS n FROM "${t}"`); pass(`rows ${t}`, String(row.n)); }
      catch { pass(`rows ${t}`, 'table absent (ok if not yet migrated)'); }
    }
  } catch (e) {
    fail('db connectivity', `could not connect/query (${e.name || 'error'})`);
  } finally {
    try { await sq.close(); } catch { /* ignore */ }
  }
}

if (WANT_CONNECT) {
  if (!gatesOk) { fail('--connect blocked', 'preflight gates failed — not connecting'); }
  else await connectVerify();
}
report();
process.exit(results.every(r => r.ok) ? 0 : 1);
