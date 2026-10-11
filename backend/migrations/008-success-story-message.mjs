/**
 * 008-success-story-message
 *
 * Adds a dedicated `message` column to SuccessStories: the student's own
 * closing words shown as the "A Message From <name>" quote on the story page.
 * Previously the frontend derived this from the last paragraph of the story
 * text; admins now fill it in explicitly. Existing rows are backfilled with
 * their last paragraph so nothing disappears.
 *
 * Safety properties (same as 001-007):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Guarded against the table being missing and the column already existing.
 */

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'successstories')) {
    console.log('  = SuccessStories missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('SuccessStories');
  if (!columns.message) {
    await queryInterface.addColumn('SuccessStories', 'message', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('  + added SuccessStories.message');
  } else {
    console.log('  = SuccessStories.message already present');
  }

  // Backfill: last paragraph of the story becomes the message for rows that
  // have none (keeps the existing quote section intact after the upgrade).
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id, story FROM "SuccessStories" WHERE message IS NULL OR message = \'\''
  );
  if (rows && rows.length > 0) {
    let filled = 0;
    for (const row of rows) {
      const paras = String(row.story || '')
        .replace(/\r\n/g, '\n')
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (paras.length >= 2) {
        await queryInterface.sequelize.query(
          'UPDATE "SuccessStories" SET message = ? WHERE id = ?',
          { replacements: [paras[paras.length - 1], row.id] }
        );
        filled += 1;
      }
    }
    if (filled > 0) console.log(`  + backfilled message for ${filled} rows`);
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'successstories')) return;
  const columns = await queryInterface.describeTable('SuccessStories');
  if (columns.message) {
    await queryInterface.removeColumn('SuccessStories', 'message');
  }
}