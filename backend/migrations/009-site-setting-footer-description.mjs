/**
 * 009-site-setting-footer-description
 *
 * Adds the `footer_description` column to SiteSettings so admins can edit the
 * site footer tagline from the admin panel (SiteSettings page sends it, the
 * public Footer.jsx renders it).
 *
 * Safety properties (same as 001-008):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Guarded against the table being missing and the column already existing.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'sitesettings')) {
    console.log('  = SiteSettings missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('SiteSettings');
  if (!columns.footer_description) {
    await queryInterface.addColumn('SiteSettings', 'footer_description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('  + added SiteSettings.footer_description');
  } else {
    console.log('  = SiteSettings.footer_description already present');
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'sitesettings')) return;
  const columns = await queryInterface.describeTable('SiteSettings');
  if (columns.footer_description) {
    await queryInterface.removeColumn('SiteSettings', 'footer_description');
  }
}