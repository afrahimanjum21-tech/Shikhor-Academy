import models from '../../models/index.js';
import { Op } from 'sequelize';

const LIVE_STUDENT_INCLUDE = {
  model: models.User,
  where: { role: 'student', is_active: true },
  required: true,
};

export const summary = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const assignments = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      include: [{ model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title'] }] }],
    });

    const validAssignmentsRaw = assignments.filter(a => a.Batch);
    const batchIds = [...new Set(validAssignmentsRaw.map(a => a.Batch.id))];

    const studentCounts = batchIds.length > 0 ? await models.Student.count({
      where: { current_batch_id: { [Op.in]: batchIds } },
      include: [LIVE_STUDENT_INCLUDE],
      attributes: ['current_batch_id'],
      group: ['current_batch_id'],
    }) : [];

    const countMap = {};
    studentCounts.forEach(sc => { countMap[sc.current_batch_id] = parseInt(sc.count); });

    const assignedBatches = validAssignmentsRaw.map((assn) => {
      const batch = assn.Batch;
      return {
        id: assn.id,
        batch_id: batch.id,
        subject: assn.subject,
        name: batch.name,
        course: batch.Course ? { id: batch.Course.id, title: batch.Course.title } : null,
        start_time: batch.start_time,
        end_time: batch.end_time,
        student_count: countMap[batch.id] || 0,
      };
    });

    const courseIds = [...new Set(assignedBatches.map(a => a.course?.id).filter(Boolean))];

    const [totalBatches, totalStudents, totalAssignments, todayAttendance] = await Promise.all([
      Promise.resolve(batchIds.length),
      models.Student.count({ where: { current_batch_id: { [Op.in]: batchIds } }, include: [LIVE_STUDENT_INCLUDE] }),
      models.Assignment.count({ where: { teacher_id: teacherId } }),
      models.Attendance.count({
        where: { date: today, batch_id: { [Op.in]: batchIds } },
        distinct: true,
        col: 'student_id',
      }),
    ]);

    const todayClasses = batchIds.length > 0 ? await models.Routine.count({
      where: { batch_id: { [Op.in]: batchIds }, day: todayName, status: 'published' },
    }) : 0;

    const upcomingExams = courseIds.length > 0 ? await models.Exam.count({
      where: { course_id: { [Op.in]: courseIds }, date: { [Op.gte]: today } },
    }) : 0;

    const recentNotices = await models.Notice.findAll({
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 5,
    });

    const latestMaterials = await models.StudyMaterial.findAll({
      where: { uploaded_by: teacherId },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const pendingAttendanceCount = totalStudents - todayAttendance;

    res.json({
      data: {
        today_classes: todayClasses,
        total_batches: totalBatches,
        total_students: totalStudents,
        total_assignments: totalAssignments,
        upcoming_exams: upcomingExams,
        pending_attendance: pendingAttendanceCount > 0 ? pendingAttendanceCount : 0,
        assigned_batches: assignedBatches,
        recent_notices: recentNotices,
        latest_materials: latestMaterials,
      },
    });
  } catch (error) {
    console.error('TeacherDashboardController.summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};

export const myBatches = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const assignments = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      include: [
        {
          model: models.Batch,
          include: [
            { model: models.Course, attributes: ['id', 'title'] },
          ],
        },
      ],
    });

    const validAssignmentsRaw = assignments.filter(a => a.Batch);
    const batchIds = [...new Set(validAssignmentsRaw.map(a => a.Batch.id))];

    const studentCounts = batchIds.length > 0 ? await models.Student.count({
      where: { current_batch_id: { [Op.in]: batchIds } },
      include: [LIVE_STUDENT_INCLUDE],
      attributes: ['current_batch_id'],
      group: ['current_batch_id'],
    }) : [];

    const countMap = {};
    studentCounts.forEach(sc => { countMap[sc.current_batch_id] = parseInt(sc.count); });

    const batches = validAssignmentsRaw.map((assn) => {
      const batch = assn.Batch;
      return {
        id: assn.id,
        batch_id: batch.id,
        subject: assn.subject,
        name: batch.name,
        course: batch.Course ? { id: batch.Course.id, title: batch.Course.title } : null,
        start_time: batch.start_time,
        end_time: batch.end_time,
        capacity: batch.capacity,
        student_count: countMap[batch.id] || 0,
      };
    });

    res.json({ data: batches });
  } catch (error) {
    console.error('TeacherDashboardController.myBatches error:', error);
    res.status(500).json({ message: 'Failed to fetch batches' });
  }
};

export const myStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const batchIds = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      attributes: ['batch_id'],
    }).then(rows => rows.map(r => r.batch_id));

    const students = await models.Student.findAll({
      where: { current_batch_id: { [Op.in]: batchIds } },
      include: [
        {
          model: models.User,
          attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'],
          where: { role: 'student', is_active: true },
          required: true,
        },
        { model: models.Batch, attributes: ['id', 'name'] },
      ],
      order: [['admission_date', 'DESC']],
    });

    res.json({ data: students });
  } catch (error) {
    console.error('TeacherDashboardController.myStudents error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};
