/**
 * 011-pending-credential-changes
 *
 * Creates the PendingCredentialChanges table backing the secure credential-
 * change workflow (SEC-4). The confirmation link now carries only an opaque,
 * single-use random token; the server stores just its SHA-256 hash plus the
 * pending new email / new bcrypt password hash — never in the URL or a JWT.
 *
 * Safety properties (same as 001-010):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Idempotent; guarded against the table already existing.
 */

import PendingCredentialChange from '../models/PendingCredentialChange.js';

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const table = String(PendingCredentialChange.getTableName()).toLowerCase();
  if (tables.some((t) => String(t).toLowerCase() === table)) {
    console.log(`  = ${PendingCredentialChange.getTableName()} already exists, skipping`);
    return;
  }

  await queryInterface.createTable(PendingCredentialChange.getTableName(), PendingCredentialChange.rawAttributes);
  // token_hash is already UNIQUE (column-level). Add a secondary index on
  // user_id for the "drop prior unconsumed tokens" cleanup query.
  try {
    await queryInterface.addIndex(PendingCredentialChange.getTableName(), ['user_id']);
  } catch (e) {
    console.log(`  = user_id index skipped: ${e.message}`);
  }
  console.log(`  + ${PendingCredentialChange.getTableName()}`);
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const table = String(PendingCredentialChange.getTableName()).toLowerCase();
  if (tables.some((t) => String(t).toLowerCase() === table)) {
    await queryInterface.dropTable(PendingCredentialChange.getTableName());
  }
}
