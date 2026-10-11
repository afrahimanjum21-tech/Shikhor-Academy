#!/usr/bin/env node
/**
 * check-sec5.mjs — LIVE SEC-5 (server-side token revocation) check.
 *
 * Proves end-to-end that a JWT is rejected AFTER logout bumps the account's
 * token_version. Talks ONLY to the locally running API over HTTP — it does NOT
 * connect to the database directly, and never prints the token, password, or
 * any PII (only HTTP status codes).
 *
 * Flow:
 *   1. POST /api/login            -> expect 200, receive a token
 *   2. GET  /api/user (token)     -> expect 200 (token valid)
 *   3. POST /api/logout (token)   -> expect 200 (server bumps User.token_version)
 *   4. GET  /api/user (OLD token) -> expect 401 (token now revoked)  <-- the point
 *
 * Login auto-retries on 500/503, which usually means the Neon staging compute
 * is waking from suspension (cold start). Exits via process.exitCode (no hard
 * process.exit after HTTP calls) to avoid a libuv teardown assertion on Windows.
 *
 * Config (read from env, never printed):
 *   APP_BASE_URL   (default http://localhost:<APP_PORT|8000>)
 *   SEC5_EMAIL     (fallback SEEDER_ADMIN_EMAIL)
 *   SEC5_PASSWORD  (fallback SEEDER_PASSWORD)
 *
 *   node scripts/check-sec5.mjs
 */
import process from 'node:process';

const base = (process.env.APP_BASE_URL || `http://localhost:${process.env.APP_PORT || '8000'}`).replace(/\/$/, '');
const email = process.env.SEC5_EMAIL || process.env.SEEDER_ADMIN_EMAIL || '';
const password = process.env.SEC5_PASSWORD || process.env.SEEDER_PASSWORD || '';

if (!email || !password) {
  console.error('Admin creds not set (nothing is ever printed): set SEC5_EMAIL/SEC5_PASSWORD or SEEDER_ADMIN_EMAIL/SEEDER_PASSWORD.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    console.error(`\nCannot reach the API at ${base} (${e.code || e.message}).`);
    console.error('Start it first in another window with your STAGING env:  npm start');
    process.exit(3);
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body is fine */ }
  return { status: res.status, json };
}

// Login, retrying while the server is warming up (500/503 = likely cold Neon compute).
async function login() {
  let r;
  for (let attempt = 1; attempt <= 4; attempt++) {
    r = await call('POST', '/api/login', { body: { email, password } });
    if (r.status === 200 && r.json && r.json.token) return r;
    if ((r.status === 500 || r.status === 503) && attempt < 4) {
      console.log(`  ...login ${r.status} (DB may be waking) — retrying ${attempt}/3 in 3s`);
      await sleep(3000);
      continue;
    }
    return r;
  }
  return r;
}

const lines = [];
const step = (ok, label, detail) => lines.push(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);

const loginRes = await login();
const token = loginRes.json && loginRes.json.token;
const msg = loginRes.json && loginRes.json.message ? ` "${loginRes.json.message}"` : '';
step(loginRes.status === 200 && !!token, '1) login', `${loginRes.status}${token ? ', token issued' : ', NO token' + msg}`);

if (!token) {
  console.log('\nSEC-5 live revocation check (no secrets shown):');
  lines.forEach((l) => console.log(l));
  if (loginRes.status === 401) {
    console.log('\nRESULT: login 401 = creds do not match the seeded admin on the DB the app is connected to. Check SEEDER_ADMIN_EMAIL / SEEDER_PASSWORD and that the app is on STAGING.');
  } else if (loginRes.status === 500 || loginRes.status === 503) {
    console.log(`\nRESULT: login ${loginRes.status} = the SERVER errored (NOT a wrong password). Look in the "npm start" window for a line  Login error: ...  and confirm the app connected to STAGING.`);
  } else {
    console.log('\nRESULT: could not log in — confirm the running app is on STAGING and creds match the seeded admin.');
  }
  process.exitCode = 1;
} else {
  const before = await call('GET', '/api/user', { token });
  step(before.status === 200, '2) /user with fresh token', `${before.status} (expected 200)`);

  const out = await call('POST', '/api/logout', { token });
  step(out.status === 200, '3) logout', `${out.status} (expected 200)`);

  const after = await call('GET', '/api/user', { token });
  step(after.status === 401, '4) OLD token after logout', `${after.status} (expected 401 = revoked)`);

  console.log('\nSEC-5 live revocation check (no secrets shown):');
  lines.forEach((l) => console.log(l));
  const verified = before.status === 200 && out.status === 200 && after.status === 401;
  console.log(`\nRESULT: ${verified ? 'SEC-5 VERIFIED ✅  old token rejected (401) after logout' : 'NOT verified — see FAIL rows above'}`);
  process.exitCode = verified ? 0 : 1;
}
