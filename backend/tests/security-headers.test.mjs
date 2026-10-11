import test from 'node:test';
import assert from 'node:assert/strict';
import securityHeaders from '../middleware/securityHeaders.js';
import { isPersonalizedPublicPath } from '../services/cachePolicy.js';

// H-sec3 (headers) + C15 (personalized cache policy). Pure — no HTTP/DB.

const run = (url) => {
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k] = v; } };
  let called = false;
  securityHeaders({ originalUrl: url, url }, res, () => { called = true; });
  return { headers, called };
};

test('baseline security headers are set on every response', () => {
  const { headers, called } = run('/health');
  assert.equal(called, true);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.ok(headers['Permissions-Policy']);
});

test('API responses get a locked-down CSP; files get a file CSP', () => {
  const api = run('/api/public/courses').headers['Content-Security-Policy'];
  assert.match(api, /default-src 'none'/);
  assert.match(api, /frame-ancestors 'none'/);

  const file = run('/uploads/general/x.pdf').headers['Content-Security-Policy'];
  assert.match(file, /object-src 'none'/);
  assert.match(file, /frame-ancestors 'self'/);
  // A file CSP must still permit the image/media it serves to render.
  assert.match(file, /img-src 'self'/);
});

test('isPersonalizedPublicPath: only per-viewer endpoints are non-cacheable', () => {
  assert.equal(isPersonalizedPublicPath('/materials'), true);
  assert.equal(isPersonalizedPublicPath('/e-learning'), true);
  assert.equal(isPersonalizedPublicPath('/materials/'), true);
  assert.equal(isPersonalizedPublicPath('/courses'), false);
  assert.equal(isPersonalizedPublicPath('/notices'), false);
  assert.equal(isPersonalizedPublicPath('/'), false);
});
