/**
 * 018-biometric-attendance
 *
 * Prepares the system to ingest attendance from a fingerprint/biometric device
 * (e.g. ZKTeco) via a secure HTTP ingestion API (see routes/integrations.js).
 * The device itself lives on the office LAN; a small local "agent" reads its
 * punches and POSTs them to the cloud API, which maps each punch to a student
 * and records Attendance.
 *
 * Two additive, idempotent changes:
 *   1. Students.device_user_id — the enrollment id a student has ON the device
 *      (nullable, unique). This is how a raw punch is mapped back to a student.
 *   2. AttendancePunches — the raw punch log (source of truth). A UNIQUE
 *      (device_id, device_user_id, punched_at) makes re-sent logs idempotent.
 *
 * Safety (same as 001-017): additive only; never drops/overwrites existing
 * tables, columns, or data. Guarded against re-run. down() removes ONLY what
 * this migration added.
 */

const PUNCH_TABLE = 'AttendancePunches';

async function studentsTable(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables.find((t) => String(t).toLowerCase() === 'students') || null;
}

export async function up(queryInterface, Sequelize) {
  // 1. Students.device_user_id (nullable + unique)
  const students = await studentsTable(queryInterface);
  if (students) {
    const cols = await queryInterface.describeTable(students);
    if (!cols.device_user_id) {
      await queryInterface.addColumn(students, 'device_user_id', { type: Sequelize.STRING(64), allowNull: true });
      try {
        await queryInterface.addIndex(students, ['device_user_id'], { unique: true, name: 'students_device_user_id_unique' });
      } catch (e) {
        console.log(`  = device_user_id unique index skipped: ${e.message}`);
      }
      console.log('  + Students.device_user_id');
    } else {
      console.log('  = Students.device_user_id already present, skipping');
    }
  }

  // 2. AttendancePunches (raw punch log)
  const tables = await queryInterface.showAllTables();
  if (tables.some((t) => String(t).toLowerCase() === PUNCH_TABLE.toLowerCase())) {
    console.log(`  = ${PUNCH_TABLE} already exists, skipping`);
    return;
  }
  await queryInterface.createTable(PUNCH_TABLE, {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    // '' when the device doesn't send an id, so the unique index stays reliable
    // (Postgres treats NULLs as distinct, which would defeat de-duplication).
    device_id: { type: Sequelize.STRING(64), allowNull: false, defaultValue: '' },
    device_user_id: { type: Sequelize.STRING(64), allowNull: false },
    student_id: { type: Sequelize.INTEGER, allowNull: true },
    punched_at: { type: Sequelize.DATE, allowNull: false },
    direction: { type: Sequelize.STRING(10), allowNull: true }, // 'in' | 'out' | null
    status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'received' }, // received|mapped|unmapped
    attendance_id: { type: Sequelize.INTEGER, allowNull: true },
    raw: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
  });
  try {
    await queryInterface.addIndex(PUNCH_TABLE, ['device_id', 'device_user_id', 'punched_at'], { unique: true, name: 'attendance_punch_dedupe_unique' });
  } catch (e) {
    console.log(`  = punch dedupe index skipped: ${e.message}`);
  }
  try {
    await queryInterface.addIndex(PUNCH_TABLE, ['student_id']);
    await queryInterface.addIndex(PUNCH_TABLE, ['status']);
  } catch (e) {
    console.log(`  = punch secondary index skipped: ${e.message}`);
  }
  console.log(`  + ${PUNCH_TABLE}`);
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.some((t) => String(t).toLowerCase() === PUNCH_TABLE.toLowerCase())) {
    await queryInterface.dropTable(PUNCH_TABLE);
  }
  const students = await studentsTable(queryInterface);
  if (students) {
    const cols = await queryInterface.describeTable(students);
    if (cols.device_user_id) {
      try { await queryInterface.removeIndex(students, 'students_device_user_id_unique'); } catch { /* ignore */ }
      await queryInterface.removeColumn(students, 'device_user_id');
    }
  }
}
