/**
 * 015-routine-time-backfill
 *
 * D5: existing Routine rows were saved with a `time_slot` label but NULL
 * `start_time`/`end_time`, so the unique index (batch_id, day, start_time,
 * end_time, status) was inert and `myRoutine`'s `ORDER BY start_time` was
 * unreliable. This backfills start_time/end_time from time_slot for rows that
 * are missing them (controllers now populate these going forward).
 *
 * Safety (same as 001-014): additive data-repair, idempotent (only touches
 * NULL/empty rows), never drops anything, does not change timetable rules
 * (times are derived only from the existing label). down() is disabled.
 *
 * The parse is INLINED (not imported from services/) so this migration stays
 * frozen regardless of later service changes.
 */

const TABLE = 'Routines';

function parseTimeSlot(timeSlot) {
  const raw = String(timeSlot == null ? '' : timeSlot).trim();
  if (!raw) return { start_time: '', end_time: '' };
  const m = raw.match(/^(.+?)\s*(?:-|–|—|to)\s*(.+?)$/i);
  if (m && m[1].trim() && m[2].trim()) return { start_time: m[1].trim(), end_time: m[2].trim() };
  return { start_time: raw, end_time: raw };
}

export async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const name = tables.find((t) => String(t).toLowerCase() === TABLE.toLowerCase());
  if (!name) {
    console.log('  = Routines missing, skipping');
    return;
  }

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, time_slot FROM "${name}"
     WHERE (start_time IS NULL OR start_time = '' OR end_time IS NULL OR end_time = '')
       AND time_slot IS NOT NULL AND time_slot <> ''`
  );
  let fixed = 0;
  for (const row of rows || []) {
    const { start_time, end_time } = parseTimeSlot(row.time_slot);
    await queryInterface.sequelize.query(
      `UPDATE "${name}" SET start_time = ?, end_time = ? WHERE id = ?`,
      { replacements: [start_time, end_time, row.id] }
    );
    fixed += 1;
  }
  console.log(`  + backfilled start/end time for ${fixed} routine row(s)`);
}

export async function down() {
  throw new Error('down() for 015-routine-time-backfill is intentionally disabled (data repair).');
}
