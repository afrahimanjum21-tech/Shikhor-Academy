/**
 * 007-success-story-slugs
 *
 * Adds a unique, human-readable `slug` to SuccessStories so each story can
 * have its own public URL (e.g. /success-stories/rahim-uddin) instead of being
 * shown in a modal. Backfills existing rows from student_name and dedupes
 * collisions with a numeric suffix, then locks uniqueness with an index.
 *
 * Safety properties (same as 001-006):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Guarded against the table being missing and the column already existing.
 */

export const slugify = (name) =>
  String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'story';

// Pure, testable slug resolution. `existingSlugs` = slugs ALREADY in the table;
// `rows` = [{ id, student_name }] needing a slug. Returns [{ id, slug }] where
// every slug is unique against the existing set AND against the ones generated
// in this run (deterministic numeric suffix). Preserves existing slugs by never
// reusing them. No private data in the return (ids + derived slugs only).
export function resolveSlugs(existingSlugs, rows) {
  const used = new Set(existingSlugs || []);
  const out = [];
  for (const row of rows || []) {
    const base = slugify(row.student_name);
    let slug = base;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    out.push({ id: row.id, slug });
  }
  return out;
}

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'successstories')) {
    console.log('  = SuccessStories missing, skipping');
    return;
  }

  const columns = await queryInterface.describeTable('SuccessStories');
  if (!columns.slug) {
    await queryInterface.addColumn('SuccessStories', 'slug', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    console.log('  + added SuccessStories.slug');
  } else {
    console.log('  = SuccessStories.slug already present');
  }

  // Collisions must be resolved against BOTH the slugs already stored (rows that
  // kept their slug on a rerun, or were set elsewhere) AND the ones generated in
  // this run \u2014 otherwise the unique index below can fail on a non-pristine DB.
  const [existing] = await queryInterface.sequelize.query(
    'SELECT slug FROM "SuccessStories" WHERE slug IS NOT NULL AND slug <> \'\''
  );
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id, student_name FROM "SuccessStories" WHERE slug IS NULL OR slug = \'\''
  );
  if (rows && rows.length > 0) {
    const resolved = resolveSlugs((existing || []).map((r) => r.slug), rows);
    for (const { id, slug } of resolved) {
      await queryInterface.sequelize.query(
        'UPDATE "SuccessStories" SET slug = ? WHERE id = ?',
        { replacements: [slug, id] }
      );
    }
    console.log(`  + backfilled slugs for ${resolved.length} row(s)`);
  }

  const indexes = await queryInterface.showIndex('SuccessStories');
  if (!indexes.some((i) => i.name === 'success_stories_slug_unique')) {
    await queryInterface.addIndex('SuccessStories', ['slug'], {
      unique: true,
      name: 'success_stories_slug_unique',
    });
    console.log('  + added unique index on SuccessStories.slug');
  } else {
    console.log('  = unique index already present');
  }
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => String(t).toLowerCase() === 'successstories')) return;
  const indexes = await queryInterface.showIndex('SuccessStories');
  if (indexes.some((i) => i.name === 'success_stories_slug_unique')) {
    await queryInterface.removeIndex('SuccessStories', 'success_stories_slug_unique');
  }
  const columns = await queryInterface.describeTable('SuccessStories');
  if (columns.slug) {
    await queryInterface.removeColumn('SuccessStories', 'slug');
  }
}
