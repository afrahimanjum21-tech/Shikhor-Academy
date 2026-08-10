import models from '../models/index.js';
import { Op } from 'sequelize';
import { parseSince, makeAfter } from '../utils/sinceFilters.js';

// Short-lived in-memory cache: the frontend polls this endpoint every 60s per
// tab, and several tabs can be open at once. Serving repeated identical
// requests from the cache avoids stacking many parallel DB queries on a single
// serverless instance (which is what pushes cold starts toward timeouts/503s).
const CACHE_TTL_MS = 10000;
const countsCache = new Map();

const cacheKeyFor = (req) => `${req.user.id}:${req.user.role}:${JSON.stringify(req.query)}`;

// Opportunistic cleanup so the map can't grow without bound.
const pruneCache = () => {
  const now = Date.now();
  for (const [k, v] of countsCache) {
    if (now - v.at >= CACHE_TTL_MS) countsCache.delete(k);
  }
};

export const counts = async (req, res) => {
  try {
    const key = cacheKeyFor(req);
    const hit = countsCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return res.json({ data: hit.value });
    }

    const user = req.user;
    const counts = {};

    // The frontend sends since_<page> timestamps (last time the user viewed
    // that page). Counts must only include items created/updated AFTER that
    // timestamp, otherwise bubbles reappear after viewing a page.
    const since = parseSince(req.query);
    const after = makeAfter(since);

    const unreadNotifications = await models.Notification.count({
      where: { user_id: user.id, read_at: null },
    });

    if (user.role === 'admin' || user.role === 'super_admin') {
      const [pendingAdmissions, holdAdmissions, pendingPayments, pendingLeaveRequests, unreadMessages] = await Promise.all([
        models.AdmissionApplication.count({ where: { status: 'pending', ...after('createdAt', 'admissions') } }),
        models.AdmissionApplication.count({ where: { status: 'hold', ...after('createdAt', 'admissions') } }),
        models.Payment.count({ where: { status: 'pending', ...after('createdAt', 'payments') } }),
        models.Attendance.count({ where: { leave_status: 'pending', ...after('createdAt', 'leaves') } }),
        models.ContactMessage.count({ where: { is_read: false, ...after('createdAt', 'messages') } }),
      ]);

      counts.pending_admissions = pendingAdmissions;
      counts.hold_admissions = holdAdmissions;
      counts.pending_payments = pendingPayments;
      counts.pending_leave_requests = pendingLeaveRequests;
      counts.unread_messages = unreadMessages;

      // The bell bubble is the total of everything actionable, so it matches
      // the items listed in the notification dropdown.
      counts.notifications = unreadNotifications + pendingAdmissions + holdAdmissions + pendingPayments + pendingLeaveRequests + unreadMessages;
    }

    if (user.role === 'teacher') {
      const teacherId = user.id;

      const batchIds = await models.TeacherBatchAssignment.findAll({
        where: { teacher_id: teacherId },
        attributes: ['batch_id'],
      }).then(rows => rows.map(r => r.batch_id));

      const [pendingSubmissions, totalStudents] = await Promise.all([
        models.AssignmentSubmission.count({
          where: { status: 'submitted', ...after('updatedAt', 'reviews') },
          include: [{
            model: models.Assignment,
            where: { teacher_id: teacherId },
            attributes: [],
          }],
        }),
        models.Student.count({
          where: { current_batch_id: { [Op.in]: batchIds } },
        }),
      ]);

      counts.pending_submissions = pendingSubmissions;
      counts.pending_reviews = pendingSubmissions;
      counts.total_students = totalStudents;
      counts.notifications = unreadNotifications + pendingSubmissions;
    }

    if (user.role === 'student') {
      counts.notifications = unreadNotifications;

      const student = await models.Student.findOne({ where: { user_id: user.id } });

      if (student) {
        const batchId = student.current_batch_id || null;
        const today = new Date().toISOString().split('T')[0];

        const [
          pendingFees,
          gradedResults,
          publishedResults,
          routines,
          upcomingEvents,
          attendanceRecords,
          activities,
          videos,
          materials,
          albums,
          assignments,
        ] = await Promise.all([
          models.Payment.count({ where: { student_id: student.id, status: 'due', ...after('createdAt', 'fees') } }),
          models.AssignmentSubmission.count({ where: { student_id: student.id, status: 'graded', ...after('updatedAt', 'results') } }),
          models.ExamResult.count({
            where: { student_id: student.id, ...after('createdAt', 'exam_results') },
            include: [{ model: models.Exam, where: { is_published: true }, attributes: [] }],
          }),
          models.Routine.count({ where: { batch_id: batchId, status: 'published', ...after('updatedAt', 'routine') } }),
          models.AcademicEvent.count({ where: { date: { [Op.gte]: today }, ...after('createdAt', 'calendar') } }),
          models.Attendance.count({ where: { student_id: student.id, ...after('createdAt', 'attendance') } }),
          models.AcademicEvent.count({ where: { type: 'event', ...after('createdAt', 'extra_curricular', 'attitude') } }),
          models.ElearningVideo.count({ where: { is_active: true, ...after('createdAt', 'e_learning') } }),
          models.StudyMaterial.count({ where: { ...after('createdAt', 'library') } }),
          models.Album.count({ where: { ...after('createdAt', 'gallery') } }),
          models.Assignment.count({ where: { batch_id: batchId, ...after('createdAt', 'assignments') } }),
        ]);

        // Keys consumed by the student sidebar / notification context
        counts.pending_fees = pendingFees;
        counts.recently_reviewed = gradedResults;
        counts.new_exam_results = publishedResults;
        counts.updated_routine = routines;
        counts.new_events = upcomingEvents;
        counts.attendance_updates = attendanceRecords;
        counts.new_activities = activities;
        counts.new_videos = videos;
        counts.new_materials = materials;
        counts.new_albums = albums;
        counts.pending_assignments = assignments;

        // Keep the legacy keys too
        counts.due_payments = pendingFees;
        counts.graded_results = gradedResults;
      }
    }

    if (countsCache.size > 200) pruneCache();
    countsCache.set(key, { at: Date.now(), value: counts });
    res.json({ data: counts });
  } catch (error) {
    console.error('NotificationCountsController.counts error:', error);
    res.status(500).json({ message: 'Failed to fetch counts' });
  }
};
