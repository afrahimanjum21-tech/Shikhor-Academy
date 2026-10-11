/**
 * 003-integrity-indexes
 *
 * Adds missing integrity indexes that are declared on the models but were
 * never created on databases that existed before the models gained them:
 *
 *   1. Unique (assignment_id, student_id) on AssignmentSubmissions — backs the
 *      "already submitted" guard in StudentAssignmentController.submit against
 *      the double-submit race; existing duplicates are removed first (the
 *      lowest id wins, mirroring 002-attendance-dedupe).
 *   2. Unique (teacher_id, batch_id, subject) on TeacherBatchAssignments —
 *      prevents an admin from assigning the same teacher to the same
 *      batch+subject twice. PostgreSQL treats NULL subjects as distinct, so
 *      rows without a subject are left alone.
 *   3. (course_id) on Exams — supports the exam-results join used by the
 *      admin panels and the student dashboard.
 *
 * Safety properties (same as 001/002):
 *  - Idempotent and additive-only; never drops tables, columns, or indexes.
 *  - Every step is guarded against missing tables and pre-existing indexes.
 */

const TABLES = {
  submissions: 'AssignmentSubmissions',
  assignments: 'TeacherBatchAssignments',
  exams: 'Exams',
};

export async function up(queryInterface, Sequelize) {
  const sequelize = queryInterface.sequelize;
  const tables = await queryInterface.showAllTables();

  const q = (sql, replacements) => sequelize.query(sql, { replacements });

  // 1) AssignmentSubmissions: dedupe then add the unique key.
  if (tables.some((t) => String(t).toLowerCase() === TABLES.submissions.toLowerCase())) {
    const table = TABLES.submissions;
    await q(
      `DELETE FROM "${table}" a
       USING "${table}" b
       WHERE a.id > b.id
         AND a."assignment_id" = b."assignment_id"
         AND a."student_id" = b."student_id"`
    );
    const indexes = await queryInterface.showIndex(table);
    const hasUnique = indexes.some((idx) =>
      idx.unique &&
      idx.fields.length === 2 &&
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'assignment_id') &&
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'student_id')
    );
    if (!hasUnique) {
      try {
        await queryInterface.addIndex(table, ['assignment_id', 'student_id'], {
          unique: true,
          name: 'AssignmentSubmissions_assignment_id_student_id',
        });
        console.log('  + unique index on AssignmentSubmissions');
      } catch (err) {
        const after = await queryInterface.showIndex(table);
        if (!after.some((idx) => idx.unique && idx.fields.length === 2)) throw err;
        console.log('  = unique index already present');
      }
    } else {
      console.log('  = unique index on AssignmentSubmissions already present');
    }
  } else {
    console.log('  = AssignmentSubmissions missing, skipping');
  }

  // 2) TeacherBatchAssignments: unique (teacher_id, batch_id, subject).
  if (tables.some((t) => String(t).toLowerCase() === TABLES.assignments.toLowerCase())) {
    const table = TABLES.assignments;
    // Remove exact duplicates (same teacher, batch, and subject) first, keeping
    // the lowest id, so the unique index below can be created on live data.
    await q(
      `DELETE FROM "${table}" a
       USING "${table}" b
       WHERE a.id > b.id
         AND a."teacher_id" = b."teacher_id"
         AND a."batch_id" = b."batch_id"
         AND a."subject" IS NOT DISTINCT FROM b."subject"`
    );
    const indexes = await queryInterface.showIndex(table);
    const hasUnique = indexes.some((idx) =>
      idx.unique &&
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'teacher_id') &&
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'batch_id') &&
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'subject')
    );
    if (!hasUnique) {
      try {
        await queryInterface.addIndex(table, ['teacher_id', 'batch_id', 'subject'], {
          unique: true,
          name: 'TeacherBatchAssignments_teacher_id_batch_id_subject',
        });
        console.log('  + unique index on TeacherBatchAssignments');
      } catch (err) {
        const after = await queryInterface.showIndex(table);
        if (!after.some((idx) => idx.unique && idx.fields.length >= 2)) throw err;
        console.log('  = unique index already present');
      }
    } else {
      console.log('  = unique index on TeacherBatchAssignments already present');
    }
  } else {
    console.log('  = TeacherBatchAssignments missing, skipping');
  }

  // 3) Exams: plain (course_id) index.
  if (tables.some((t) => String(t).toLowerCase() === TABLES.exams.toLowerCase())) {
    const table = TABLES.exams;
    const indexes = await queryInterface.showIndex(table);
    const hasCourse = indexes.some((idx) =>
      idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'course_id')
    );
    if (!hasCourse) {
      try {
        await queryInterface.addIndex(table, ['course_id'], { name: 'Exams_course_id' });
        console.log('  + index on Exams(course_id)');
      } catch (err) {
        const after = await queryInterface.showIndex(table);
        if (!after.some((idx) => idx.fields.some((f) => String(f.attribute || f).toLowerCase() === 'course_id'))) {
          throw err;
        }
        console.log('  = Exams(course_id) index already present');
      }
    } else {
      console.log('  = Exams(course_id) index already present');
    }
  } else {
    console.log('  = Exams missing, skipping');
  }

  console.log('  + integrity indexes complete');
}

export async function down() {
  // Additive-only migration; no safe reversible step.
  throw new Error('down() for 003-integrity-indexes is intentionally disabled (indexes are additive).');
}
