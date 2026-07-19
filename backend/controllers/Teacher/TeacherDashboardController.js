import models from '../../models/index.js';
import { Op } from 'sequelize';

export const summary = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const batchIds = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      attributes: ['batch_id'],
    }).then(rows => rows.map(r => r.batch_id));

    const totalBatches = batchIds.length;

    const totalStudents = await models.Student.count({
      where: { current_batch_id: { [Op.in]: batchIds } },
    });

    const totalAssignments = await models.Assignment.count({
      where: { teacher_id: teacherId },
    });

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await models.Attendance.count({
      where: { date: today, course_id: { [Op.in]: batchIds } },
    });

    res.json({
      data: {
        total_batches: totalBatches,
        total_students: totalStudents,
        total_assignments: totalAssignments,
        today_attendance: todayAttendance,
      },
    });
  } catch (error) {
    console.error('TeacherDashboardController.summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary', error: error.message });
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

    const batches = await Promise.all(assignments.map(async (assn) => {
      const batch = assn.Batch;
      if (!batch) return null;

      const studentCount = await models.Student.count({
        where: { current_batch_id: batch.id },
      });

      return {
        ...batch.toJSON(),
        subject: assn.subject,
        student_count: studentCount,
      };
    }));

    res.json({ data: batches.filter(Boolean) });
  } catch (error) {
    console.error('TeacherDashboardController.myBatches error:', error);
    res.status(500).json({ message: 'Failed to fetch batches', error: error.message });
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
        { model: models.User, attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'] },
        { model: models.Batch, attributes: ['id', 'name'] },
      ],
      order: [['admission_date', 'DESC']],
    });

    res.json({ data: students });
  } catch (error) {
    console.error('TeacherDashboardController.myStudents error:', error);
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
};
