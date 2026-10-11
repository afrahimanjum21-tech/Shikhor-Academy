import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import * as mig from '../migrations/013-widen-secret-columns.mjs';

// H-sec2 — encrypted-secret columns must be TEXT (the enc:v1: envelope can
// exceed VARCHAR(255)). Guards against a revert to STRING.

after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

test('encrypted-secret columns are TEXT in the models', () => {
  assert.equal(models.SiteSetting.rawAttributes.smtp_password.type.key, 'TEXT');
  assert.equal(models.SiteSetting.rawAttributes.email_api_key.type.key, 'TEXT');
  assert.equal(models.PaymentSetting.rawAttributes.store_password.type.key, 'TEXT');
});

test('migration 013 exports up(); down() is intentionally disabled', async () => {
  assert.equal(typeof mig.up, 'function');
  assert.equal(typeof mig.down, 'function');
  await assert.rejects(() => mig.down(), /disabled/i);
});
