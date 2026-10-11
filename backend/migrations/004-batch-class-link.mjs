/**
 * 004-batch-class-link
 *
 * Adds an optional `class_link` column to Batches so an admin can attach a
 * Google Meet / Zoom / YouTube URL to a batch. The link is meant to be shown
 * only to enrolled students and assigned teachers (admin CRUD surfaces it too);
 * public course endpoints are deliberately kept free of it via attribute
 * allowlists in CourseController.
 *
 * Safety properties (same as 001/002/003):
 *  - Additive-only; never drops tables, columns, or indexes.
 *  - Guarded against the table being missing.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'batches')) {
    console.log('  = Batches missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('Batches');
  if (!columns.class_link) {
    await queryInterface.addColumn('Batches', 'class_link', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    console.log('  + added Batches.class_link');
  } else {
    console.log('  = Batches.class_link already present');
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'batches')) return;
  const columns = await queryInterface.describeTable('Batches');
  if (columns.class_link) {
    await queryInterface.removeColumn('Batches', 'class_link');
  }
}
