import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { update } from '../controllers/Admin/SiteSettingController.js';

// C11 — email_enabled must be parsed strictly: the string 'false' disables it.

const origInstance = models.SiteSetting.instance;
let captured;
afterEach(() => { models.SiteSetting.instance = origInstance; captured = undefined; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

function makeSetting(over = {}) {
  const row = { id: 1, site_name: 'X', hero_title: 'T', hero_subtitle: 'S', smtp_password: null, email_api_key: null, email_enabled: null, ...over };
  return { ...row, toJSON: () => ({ ...row }), async update(vals) { captured = vals; Object.assign(row, vals); } };
}
const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('the string "false" disables email_enabled', async () => {
  const setting = makeSetting({ email_enabled: true });
  models.SiteSetting.instance = async () => setting;
  await update({ body: { email_enabled: 'false' } }, makeRes());
  assert.equal(captured.email_enabled, false);
});

test('the string "true" and the boolean false are both honored', async () => {
  let setting = makeSetting({ email_enabled: false });
  models.SiteSetting.instance = async () => setting;
  await update({ body: { email_enabled: 'true' } }, makeRes());
  assert.equal(captured.email_enabled, true);

  setting = makeSetting({ email_enabled: true });
  models.SiteSetting.instance = async () => setting;
  await update({ body: { email_enabled: false } }, makeRes());
  assert.equal(captured.email_enabled, false);
});

test('a missing email_enabled is not written', async () => {
  const setting = makeSetting();
  models.SiteSetting.instance = async () => setting;
  await update({ body: { site_name: 'Z' } }, makeRes());
  assert.ok(!('email_enabled' in captured), 'email_enabled must not be in the update payload');
});
