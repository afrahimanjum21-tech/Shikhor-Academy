/**
 * 019-site-setting-about-photos
 *
 * Adds three context-specific image fields for the public About page.
 * The migration is additive and safe to run more than once.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === 'sitesettings')) {
    console.log('  = SiteSettings missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('SiteSettings');
  for (const name of ['about_photo_1', 'about_photo_2', 'about_photo_3']) {
    if (!columns[name]) {
      await queryInterface.addColumn('SiteSettings', name, {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log(`  + added SiteSettings.${name}`);
    }
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === 'sitesettings')) return;
  const columns = await queryInterface.describeTable('SiteSettings');
  for (const name of ['about_photo_1', 'about_photo_2', 'about_photo_3']) {
    if (columns[name]) await queryInterface.removeColumn('SiteSettings', name);
  }
}
