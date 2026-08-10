import jwt from 'jsonwebtoken';
import models from '../models/index.js';
import authConfig from '../config/auth.js';
import { getTokenFromReq } from '../services/cookie.js';

// Resolves the currently-viewing student (optional auth) into an access
// profile: { batchId, courseId, section } — or null for anonymous visitors.
export const resolveStudentAccess = async (req) => {
  try {
    // Bearer header first (backward compatible); HttpOnly cookie fallback.
    const token = getTokenFromReq(req);
    if (!token) return null;
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    const student = await models.Student.findOne({
      where: { user_id: decoded.id },
      include: [{ model: models.Batch, attributes: ['id', 'course_id'] }],
    });
    if (!student) return null;
    return {
      batchId: student.current_batch_id || null,
      courseId: student.Batch?.course_id || null,
      section: String(student.section || '').trim().toLowerCase(),
    };
  } catch {
    return null;
  }
};

// True when an item (video / material) is unlocked for the given student.
// access_type: 'all' (default) | 'batch' | 'class' | 'course'
export const isUnlocked = (item, student) => {
  if (!student) return false;
  const type = item.access_type || 'all';
  if (type === 'all') return true;
  if (type === 'batch') return !!item.batch_id && student.batchId === Number(item.batch_id);
  if (type === 'course') return !!item.course_id && student.courseId === Number(item.course_id);
  if (type === 'class') {
    const cls = String(item.class_name || '').trim().toLowerCase();
    return !!cls && cls === student.section;
  }
  return true;
};

export const normalizeAccessType = (value) => {
  const type = String(value || 'all').toLowerCase();
  return ['all', 'batch', 'class', 'course'].includes(type) ? type : 'all';
};
