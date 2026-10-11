/**
 * 010-user-token-version
 *
 * Adds `token_version` to Users for server-side JWT revocation (SEC-5).
 * Auth tokens embed the account's token_version at issue time; bumping it
 * (logout, password change, credential change) invalidates every previously
 * issued token. Default 0 keeps all existing tokens valid until the first bump.
 *
 * Safety properties (same as 001-009):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Idempotent; guarded against the table being missing / column present.
 *  - Backfills existing rows with 0 via the column default.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'users')) {
    console.log('  = Users missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('Users');
  if (!columns.token_version) {
    await queryInterface.addColumn('Users', 'token_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    console.log('  + added Users.token_version');
  } else {
    console.log('  = Users.token_version already present');
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'users')) return;
  const columns = await queryInterface.describeTable('Users');
  if (columns.token_version) {
    await queryInterface.removeColumn('Users', 'token_version');
  }
}
