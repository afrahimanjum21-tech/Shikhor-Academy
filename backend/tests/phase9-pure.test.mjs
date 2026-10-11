import test from 'node:test';
import assert from 'node:assert/strict';
import { csrfProtection, CSRF_COOKIE } from '../middleware/csrf.js';
import { signSetupToken, verifySetupToken, decodeUserId, SETUP_TOKEN_TTL_MS } from '../services/passwordSetupToken.js';
import authConfig from '../config/auth.js';

// Phase 9 pure-logic tests: CSRF double-submit guard (J) + one-time
// password-setup token (E5). No DB, no models imported.

const AUTH = authConfig.cookieName; // 'uttoron_auth'

function makeReqRes({ method = 'GET', cookie = '', authorization = '', csrfHeader, path = '/api/x' } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  if (csrfHeader !== undefined) headers['x-csrf-token'] = csrfHeader;
  const req = { method, headers, path };
  const res = {
    _status: 200,
    _json: undefined,
    _cookies: [],
    cookie(name, value, opts) { this._cookies.push({ name, value, opts }); },
    status(c) { this._status = c; return this; },
    json(p) { this._json = p; return this; },
  };
  return { req, res };
}

test('CSRF: safe GET passes and issues a csrf cookie when absent', () => {
  const { req, res } = makeReqRes({ method: 'GET' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, true);
  assert.ok(res._cookies.find((c) => c.name === CSRF_COOKIE), 'csrf cookie issued');
});

test('CSRF: POST with Bearer header is exempt (not a CSRF vector)', () => {
  const { req, res } = makeReqRes({ method: 'POST', authorization: 'Bearer abc.def.ghi' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('CSRF: POST without a session cookie is exempt (public/callback)', () => {
  const { req, res } = makeReqRes({ method: 'POST' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('CSRF: cookie-authed POST without a matching token is blocked (403)', () => {
  const { req, res } = makeReqRes({ method: 'POST', cookie: `${AUTH}=jwt; ${CSRF_COOKIE}=secret123` });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, false);
  assert.equal(res._status, 403);
});

test('CSRF: cookie-authed POST with the matching double-submit token passes', () => {
  const { req, res } = makeReqRes({ method: 'POST', cookie: `${AUTH}=jwt; ${CSRF_COOKIE}=secret123`, csrfHeader: 'secret123' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('CSRF: cookie-authed POST with a mismatched token is blocked (403)', () => {
  const { req, res } = makeReqRes({ method: 'POST', cookie: `${AUTH}=jwt; ${CSRF_COOKIE}=secret123`, csrfHeader: 'WRONG' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, false);
  assert.equal(res._status, 403);
});

test('CSRF: admission email-action endpoint is exempt (own signed-token defense)', () => {
  // Logged-in admin submitting the native email-action form: auth cookie present,
  // no header possible — must still pass because the body JWT protects it.
  const { req, res } = makeReqRes({ method: 'POST', cookie: `${AUTH}=jwt`, path: '/api/public/admissions/action' });
  let nexted = false;
  csrfProtection(req, res, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('setup token: verifies against the SAME password hash', () => {
  const hash = '$2a$12$abcdefghijklmnopqrstuv';
  const token = signSetupToken({ userId: 42, passwordHash: hash });
  assert.equal(decodeUserId(token), 42);
  const r = verifySetupToken(token, { passwordHash: hash });
  assert.equal(r.valid, true);
  assert.equal(r.userId, 42);
});

test('setup token: is SINGLE-USE — a changed hash invalidates it', () => {
  const token = signSetupToken({ userId: 7, passwordHash: 'OLD-HASH' });
  // After the student sets a password the stored hash changes:
  const r = verifySetupToken(token, { passwordHash: 'NEW-HASH' });
  assert.equal(r.valid, false);
});

test('setup token: expires', () => {
  const hash = 'h';
  const past = Date.now() - SETUP_TOKEN_TTL_MS - 1000;
  const token = signSetupToken({ userId: 1, passwordHash: hash, now: past });
  const r = verifySetupToken(token, { passwordHash: hash });
  assert.equal(r.valid, false);
  assert.equal(r.expired, true);
});

test('setup token: tampering is rejected', () => {
  const hash = 'h';
  const token = signSetupToken({ userId: 1, passwordHash: hash });
  const bad = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
  assert.equal(verifySetupToken(bad, { passwordHash: hash }).valid, false);
});
