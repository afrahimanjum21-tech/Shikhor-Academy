/**
 * check-sec6.mjs — READ-ONLY SEC-6 status check.
 *
 * Connects using process.env.DATABASE_URL (set your STAGING env first) and
 * reports whether each sensitive column is EMPTY / ENCRYPTED (enc:v1:) /
 * PLAINTEXT — it NEVER prints the actual secret value (only a length for the
 * plaintext case). No writes, SELECT only.
 *
 *   node scripts/check-sec6.mjs
 */
import process from 'node:process';

const url = (process.env.DATABASE_URL || '').trim();
if (!url) { console.error('DATABASE_URL not set — set your staging connection string first.'); process.exit(2); }

const { Sequelize, QueryTypes } = await import('sequelize');
const sq = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

const status = (v) => {
  if (v === null || v === undefined || v === '') return 'EMPTY';
  const s = String(v);
  if (s.startsWith('enc:v1:')) return 'ENCRYPTED (enc:v1:)';
  return `PLAINTEXT (len ${s.length}) <-- not encrypted`;
};

try {
  const [site] = await sq.query('SELECT smtp_password, email_api_key FROM "SiteSettings" WHERE id = 1', { type: QueryTypes.SELECT });
  const [pay] = await sq.query('SELECT store_password FROM "PaymentSettings" ORDER BY id ASC LIMIT 1', { type: QueryTypes.SELECT });
  console.log('SEC-6 at-rest status (values never shown):');
  console.log('  SiteSettings.smtp_password    :', status(site && site.smtp_password));
  console.log('  SiteSettings.email_api_key    :', status(site && site.email_api_key));
  console.log('  PaymentSettings.store_password:', status(pay && pay.store_password));
} catch (e) {
  console.error('query failed:', e.message);
  process.exitCode = 1;
} finally {
  try { await sq.close(); } catch { /* ignore */ }
}
