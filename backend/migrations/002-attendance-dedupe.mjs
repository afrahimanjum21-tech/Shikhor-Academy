/**
 * 002-attendance-dedupe
 *
 * Repairs attendance rows written before controllers resolved batch_id
 * (every writer left it NULL, so the unique index (student_id, batch_id,
 * date, session) could never match and re-saves created duplicate rows).
 *
 * Safety properties (same as 001):
 *  - Idempotent: safe to re-run; only touches NULL/duplicate rows.
 *  - Never drops columns or tables.
 *
 * Steps (all guarded):
 *  1. Backfill NULL session values from the punch-in time (morning < 12:00).
 *  2. Backfill NULL batch_id from the student's current batch.
 *  3. Delete duplicate rows (same student/batch/date/session), keeping the
 *     oldest id.
 *  4. Ensure the unique index exists (it may be missing on databases created
 *     before the model declared it).
 */

const TABLE = 'Attendances';

export async function up(queryInterface, Sequelize) {
  const sequelize = queryInterface.sequelize;

  // Guard: table may not exist on a database that skipped 001 (never happens
  // in practice, but stay additive-only).
  const tables = await queryInterface.showAllTables();
  const tableName = tables.find((t) => String(t).toLowerCase() === TABLE.toLowerCase());
  if (!tableName) {
    console.log('  = Attendances missing, skipping repair');
    return;
  }
  const q = (sql, replacements) => sequelize.query(sql, { replacements });

  // 1) Backfill NULL sessions from punch-in time. The column may be a
  // Postgres ENUM (old schema) or a plain TEXT (fresh schema); a CASE
  // expression yields `text` and must be cast explicitly for ENUM columns.
  const [enumRows] = await q(
    `SELECT t.typname AS enum_name
     FROM pg_type t
     JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname LIKE 'enum_Attendances_session%'
     LIMIT 1`
  );
  const cast = enumRows && enumRows[0] ? `::"${enumRows[0].enum_name}"` : '';
  await q(
    `UPDATE "${tableName}" SET "session" = CASE
       WHEN "punch_in_at" IS NOT NULL AND "punch_in_at" < '12:00' THEN 'morning'${cast}
       WHEN "punch_in_at" IS NOT NULL THEN 'evening'${cast}
       ELSE 'morning'${cast} END
     WHERE "session" IS NULL`
  );

  // 2) Backfill NULL batch_id from the student's current batch.
  await q(
    `UPDATE "${tableName}" a
     SET "batch_id" = s."current_batch_id"
     FROM "Students" s
     WHERE a."batch_id" IS NULL AND s."id" = a."student_id"`
  );

  // 3) Remove duplicates, keeping the lowest id per unique key.
  await q(
    `DELETE FROM "${tableName}" a
     USING "${tableName}" b
     WHERE a.id > b.id
       AND a."student_id" = b."student_id"
       AND COALESCE(a."batch_id", 0) = COALESCE(b."batch_id", 0)
       AND a."date" = b."date"
       AND a."session" = b."session"`
  );

  // 4) Ensure the unique index exists.
  const indexes = await queryInterface.showIndex(tableName);
  const hasUnique = indexes.some((idx) =>
    idx.unique &&
    idx.fields.length === 4 &&
    idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'student_id') &&
    idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'date')
  );
  if (!hasUnique) {
    try {
      await queryInterface.addIndex(tableName, ['student_id', 'batch_id', 'date', 'session'], {
        unique: true,
        name: 'Attendances_student_id_batch_id_date_session',
      });
      console.log('  + unique index on Attendances');
    } catch (err) {
      // Postgres may already have an equivalent index under another name;
      // a concurrent same-key unique index cannot be created — verify and skip.
      const after = await queryInterface.showIndex(tableName);
      if (!after.some((idx) => idx.unique && idx.fields.length === 4)) {
        throw err;
      }
      console.log('  = unique index already present');
    }
  } else {
    console.log('  = unique index already present');
  }

  console.log('  + attendance dedupe complete');
}

export async function down() {
  // Additive-only migration; no safe reversible step.
  throw new Error('down() for 002-attendance-dedupe is intentionally disabled (data repair).');
}
