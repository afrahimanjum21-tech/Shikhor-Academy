/**
 * 012-encrypt-credential-columns
 *
 * Backfills application-level encryption-at-rest (SEC-6) for existing plaintext
 * secrets, using services/secretCrypto.js (AES-256-GCM, versioned `enc:v1:`):
 *   - SiteSetting.smtp_password, SiteSetting.email_api_key
 *   - PaymentSetting.store_password
 *
 * Safety properties:
 *  - REQUIRES CREDENTIAL_ENCRYPTION_KEY; aborts loudly (no changes) if unset, so
 *    it can never silently "complete" while leaving secrets as plaintext.
 *  - Idempotent / resumable: values already encrypted (enc: prefix) are skipped,
 *    so re-running after an interruption only encrypts what remains.
 *  - Non-destructive: only transforms plaintext -> ciphertext in place; no table,
 *    column, or row is dropped. down() reverses it (decrypts back to plaintext).
 *  - Never logs secret values — only model name, row id, and column names.
 *
 * NOTE: this is a DATA migration (not DDL). It is additive to the SEC-6 code,
 * which already reads plaintext and ciphertext transparently, so running it is
 * safe at any time after the key is configured and the code is deployed.
 */
import models from '../models/index.js';
import { encryptSecret, decryptSecret, isEncrypted } from '../services/secretCrypto.js';

const TARGETS = [
  { model: 'SiteSetting', columns: ['smtp_password', 'email_api_key'] },
  { model: 'PaymentSetting', columns: ['store_password'] },
];

function assertKey() {
  if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not set. Set it (see .env.example) before running ' +
      'this migration so existing secrets can be encrypted. Aborting without changes.'
    );
  }
}

export async function up(queryInterface, Sequelize) {
  assertKey();
  for (const { model, columns } of TARGETS) {
    const Model = models[model];
    if (!Model) { console.log(`  = ${model} model missing, skipping`); continue; }
    const rows = await Model.findAll();
    for (const row of rows) {
      const changes = {};
      for (const col of columns) {
        const val = row.get(col);
        if (typeof val === 'string' && val !== '' && !isEncrypted(val)) {
          changes[col] = encryptSecret(val);
        }
      }
      if (Object.keys(changes).length > 0) {
        await row.update(changes, { silent: true }); // don't bump updatedAt
        console.log(`  + encrypted ${model} #${row.id}: ${Object.keys(changes).join(', ')}`);
      }
    }
  }
}

export async function down(queryInterface, Sequelize) {
  assertKey();
  for (const { model, columns } of TARGETS) {
    const Model = models[model];
    if (!Model) continue;
    const rows = await Model.findAll();
    for (const row of rows) {
      const changes = {};
      for (const col of columns) {
        const val = row.get(col);
        if (isEncrypted(val)) {
          const plain = decryptSecret(val);
          if (plain !== null && plain !== undefined) changes[col] = plain;
        }
      }
      if (Object.keys(changes).length > 0) {
        await row.update(changes, { silent: true });
      }
    }
  }
}
