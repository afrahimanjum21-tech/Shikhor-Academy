/**
 * 013-widen-secret-columns
 *
 * Encrypted secrets are stored as the envelope `enc:v1:<base64(iv|tag|ciphertext)>`
 * (services/secretCrypto.js), which can exceed VARCHAR(255) for longer plaintext
 * (e.g. a long email API key). Widen the affected columns to TEXT so an admin
 * save / migration 012 can never fail with a Postgres "value too long" error.
 *
 * Safety properties:
 *  - Additive / forward-only; widening VARCHAR(255) -> TEXT never truncates or
 *    drops data.
 *  - Idempotent: re-running changeColumn to TEXT on an already-TEXT column is a
 *    no-op; guarded against the table/column being missing.
 *  - Does NOT read, decrypt, or log any secret value.
 *  - down() is intentionally disabled: narrowing TEXT -> VARCHAR(255) could
 *    truncate an encrypted secret and permanently lose data.
 */
export async function up(queryInterface, Sequelize) {
  const widen = async (table, column) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.some((t) => String(t).toLowerCase() === table.toLowerCase())) {
      console.log(`  = ${table} missing, skipping`);
      return;
    }
    const cols = await queryInterface.describeTable(table);
    if (!cols[column]) {
      console.log(`  = ${table}.${column} missing, skipping`);
      return;
    }
    await queryInterface.changeColumn(table, column, { type: Sequelize.TEXT, allowNull: true });
    console.log(`  ~ ${table}.${column} -> TEXT`);
  };

  await widen('SiteSettings', 'smtp_password');
  await widen('SiteSettings', 'email_api_key');
  await widen('PaymentSettings', 'store_password');
}

export async function down() {
  throw new Error('down() for 013-widen-secret-columns is disabled (narrowing TEXT -> VARCHAR(255) could truncate encrypted secrets).');
}
