import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { show, update } from '../controllers/Admin/SiteSettingController.js';

// I-1 — the admin form field is home_hero_*, the DB column is hero_*. show/update
// must expose home_hero_* (so the real value LOADS) and map it back on write, so
// saving unrelated settings no longer overwrites the hero text with the default.

const origInstance = models.SiteSetting.instance;
let captured;
afterEach(() => { models.SiteSetting.instance = origInstance; captured = undefined; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

function makeSetting(over = {}) {
  const row = { id: 1, site_name: 'X', hero_title: 'DB TITLE', hero_subtitle: 'DB SUB', hero_bg_image: null, smtp_password: null, email_api_key: null, ...over };
  return { ...row, toJSON: () => ({ ...row }), async update(vals) { captured = vals; Object.assign(row, vals); } };
}
const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('show exposes home_hero_* mapped from the stored hero_*', async () => {
  const setting = makeSetting();
  models.SiteSetting.instance = async () => setting;
  const res = makeRes();
  await show({}, res);
  assert.equal(res.body.data.home_hero_title, 'DB TITLE');
  assert.equal(res.body.data.home_hero_subtitle, 'DB SUB');
});

test('update maps home_hero_* -> hero_* and the response re-exposes them', async () => {
  const setting = makeSetting();
  models.SiteSetting.instance = async () => setting;
  const res = makeRes();
  await update({ body: { home_hero_title: 'NEW T', home_hero_subtitle: 'NEW S' } }, res);
  assert.equal(captured.hero_title, 'NEW T');
  assert.equal(captured.hero_subtitle, 'NEW S');
  assert.equal(res.body.data.home_hero_title, 'NEW T');
});

test('saving an UNRELATED setting does NOT write hero_* (no overwrite) and preserves it', async () => {
  const setting = makeSetting();
  models.SiteSetting.instance = async () => setting;
  const res = makeRes();
  await update({ body: { site_name: 'Changed' } }, res);
  assert.ok(!('hero_title' in captured), 'hero_title must not be in the update payload');
  assert.ok(!('hero_subtitle' in captured), 'hero_subtitle must not be in the update payload');
  assert.equal(res.body.data.home_hero_title, 'DB TITLE'); // still the stored value
});
