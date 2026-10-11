import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/index.js';
import { escapeHtml, safeActionUrl, composeEmail } from '../services/email/EmailService.js';

// D9 — EmailService escapes dynamic HTML and rejects unsafe action URL schemes.

after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

test('escapeHtml neutralizes markup', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml('a & "b" \'c\''), 'a &amp; &quot;b&quot; &#39;c&#39;');
});

test('safeActionUrl allows http(s) + site-relative, rejects unsafe schemes', () => {
  assert.equal(safeActionUrl('https://x.com/a'), 'https://x.com/a');
  assert.equal(safeActionUrl('/student/results'), '/student/results');
  assert.equal(safeActionUrl('javascript:alert(1)'), '');
  assert.equal(safeActionUrl('data:text/html,x'), '');
  assert.equal(safeActionUrl('//evil.com'), ''); // protocol-relative
  assert.equal(safeActionUrl(''), '');
});

test('composeEmail renders dynamic body as TEXT, not markup', () => {
  const { html } = composeEmail({ title: 'T', body: '<img src=x onerror=alert(1)> Rahim & "co"', actionLabel: 'Go', actionUrl: '/student/results' });
  assert.ok(!html.includes('<img src=x'), 'raw markup must not appear');
  assert.ok(html.includes('&lt;img src=x'), 'body is escaped');
  assert.ok(html.includes('href="/student/results"'), 'safe action url kept');
});

test('composeEmail drops the button for an unsafe action URL', () => {
  const { html, text } = composeEmail({ title: 'T', body: 'hi', actionLabel: 'Click', actionUrl: 'javascript:alert(1)' });
  assert.ok(!html.includes('<a href'), 'no anchor rendered for an unsafe url');
  assert.ok(!text.includes('javascript:'), 'unsafe url not placed in the text body either');
});
