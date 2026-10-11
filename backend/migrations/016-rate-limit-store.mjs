/**
 * 016-rate-limit-store
 *
 * C24: creates the `rate_limits` table backing the shared, Postgres-backed
 * express-rate-limit store (services/rateLimitStore.js). With this table the
 * login / admission / contact (and optionally global) limiters enforce a limit
 * that is GLOBAL across Vercel serverless isolates instead of per-isolate.
 *
 * Safety properties (same as 001-015):
 *  - Additive-only: creates a BRAND-NEW table; never touches existing tables,
 *    columns, or data.
 *  - Idempotent: guarded against the table already existing.
 *  - Reversible: down() drops only this new table (no application data lives
 *    here — rows are ephemeral rate-limit counters).
 *
 * Enable the store at runtime with RATE_LIMIT_STORE=postgres AFTER this
 * migration has run. Until then the limiters keep using the in-memory store.
 */

const TABLE = 'rate_limits';

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (tables.some((t) => String(t).toLowerCase() === TABLE)) {
    console.log(`  = ${TABLE} already exists, skipping`);
    return;
  }

  await queryInterface.createTable(TABLE, {
    key: { type: Sequelize.STRING(255), primaryKey: true, allowNull: false },
    hits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    expires_at: { type: Sequelize.DATE, allowNull: false },
  });

  // Secondary index to make expiry sweeps / cleanup cheap.
  try {
    await queryInterface.addIndex(TABLE, ['expires_at']);
  } catch (e) {
    console.log(`  = expires_at index skipped: ${e.message}`);
  }
  console.log(`  + ${TABLE}`);
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.some((t) => String(t).toLowerCase() === TABLE)) {
    await queryInterface.dropTable(TABLE);
  }
}
