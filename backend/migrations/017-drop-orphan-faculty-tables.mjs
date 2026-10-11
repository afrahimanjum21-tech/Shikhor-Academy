/**
 * 017-drop-orphan-faculty-tables  (E2)
 *
 * Retires four ORPHANED faculty child tables whose data was long ago superseded
 * by JSON columns on the Faculty row (Faculty.qualifications / .achievements /
 * .certifications / .social_links). Code evidence (2026-10-11): no controller,
 * service, or seeder READS or WRITES these tables — the only references were
 * dead `.destroy()` cleanup calls in FacultyManagementController.forceDelete,
 * removed in the same change set. The models were also removed from
 * models/index.js so migration 001 will not recreate them.
 *
 *   FacultyQualifications, FacultyAchievements, FacultyCertifications,
 *   FacultySocialLinks
 *
 * NOT dropped (still live): FacultyGalleries (read on the public profile),
 * FacultySubjects + FacultyBatches (active join tables).
 *
 * ⚠️ DESTRUCTIVE — unlike every other migration here this REMOVES tables.
 *   - Guarded + idempotent: only drops a table that currently exists.
 *   - This does NOT copy any rows into the JSON columns; it assumes the JSON
 *     columns are already the source of truth. BEFORE running: take a DB
 *     snapshot and confirm these tables hold nothing you still need.
 *   - Deploy the CODE first (models + destroy calls already removed), THEN run
 *     this on a backed-up/staging DB. Never run directly on production without
 *     a verified backup.
 *   - down() recreates the table STRUCTURE only (data is not restored).
 */

const TABLES = ['FacultyQualifications', 'FacultyAchievements', 'FacultyCertifications', 'FacultySocialLinks'];

async function resolveActual(queryInterface, logical) {
  const tables = await queryInterface.showAllTables();
  return tables.find((t) => String(t).toLowerCase() === logical.toLowerCase()) || null;
}

export async function up(queryInterface) {
  for (const logical of TABLES) {
    const actual = await resolveActual(queryInterface, logical);
    if (!actual) {
      console.log(`  = ${logical} absent, skipping`);
      continue;
    }
    await queryInterface.dropTable(actual);
    console.log(`  - dropped ${actual}`);
  }
}

export async function down(queryInterface, Sequelize) {
  const ts = {
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
  };
  const schemas = {
    FacultyQualifications: {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      faculty_id: { type: Sequelize.INTEGER, allowNull: false },
      degree: { type: Sequelize.STRING },
      institution: { type: Sequelize.STRING },
      field_of_study: { type: Sequelize.STRING },
      passing_year: { type: Sequelize.STRING(10) },
      grade: { type: Sequelize.STRING(10) },
      ...ts,
    },
    FacultyAchievements: {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      faculty_id: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      date: { type: Sequelize.DATEONLY },
      category: { type: Sequelize.STRING(50) },
      ...ts,
    },
    FacultyCertifications: {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      faculty_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING },
      issuing_organization: { type: Sequelize.STRING },
      issue_date: { type: Sequelize.DATEONLY },
      expiry_date: { type: Sequelize.DATEONLY },
      certificate_url: { type: Sequelize.STRING },
      ...ts,
    },
    FacultySocialLinks: {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      faculty_id: { type: Sequelize.INTEGER, allowNull: false },
      platform: { type: Sequelize.STRING(50) },
      url: { type: Sequelize.STRING },
      ...ts,
    },
  };

  for (const logical of TABLES) {
    const existing = await resolveActual(queryInterface, logical);
    if (existing) continue; // already present, nothing to restore
    await queryInterface.createTable(logical, schemas[logical]);
    console.log(`  + recreated ${logical} (structure only)`);
  }
}
