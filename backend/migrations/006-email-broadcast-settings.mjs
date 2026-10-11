/**
 * 006-email-broadcast-settings
 *
 * Adds DB-backed broadcast-email settings to SiteSettings so the admin can
 * change the Brevo/Resend API key and sender address from the admin panel
 * without redeploying. The EmailService falls back to env vars when these
 * columns are null (bootstrap), and the columns take precedence once set.
 *
 * Safety properties (same as 001-005):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Guarded against the table being missing and columns already existing.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'sitesettings')) {
    console.log('  = SiteSettings missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('SiteSettings');
  const adds = [
    ['email_enabled', Sequelize.BOOLEAN],
    ['email_provider', Sequelize.STRING(20)],
    ['email_api_key', Sequelize.STRING(255)],
    ['email_from', Sequelize.STRING(255)],
  ];

  for (const [name, type] of adds) {
    if (!columns[name]) {
      await queryInterface.addColumn('SiteSettings', name, {
        type,
        allowNull: true,
      });
      console.log(`  + added SiteSettings.${name}`);
    } else {
      console.log(`  = SiteSettings.${name} already present`);
    }
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'sitesettings')) return;
  const columns = await queryInterface.describeTable('SiteSettings');
  for (const name of ['email_enabled', 'email_provider', 'email_api_key', 'email_from']) {
    if (columns[name]) {
      await queryInterface.removeColumn('SiteSettings', name);
    }
  }
}
