import models from '../../models/index.js';
import { Op } from 'sequelize';
import * as AdmissionService from '../../services/AdmissionService.js';

const responseForError = (error, fallback) => {
  const status = error.status || 500;
  if (status === 500) console.error(fallback, error);
  return { status, message: status === 500 ? `Internal server error: ${error.message}` : error.message };
};

// NEW-001: the approve response must never serialize the raw User instance —
// that leaks the bcrypt `password` hash and token_version to the client. Keep
// only the fields the admin UI needs.
export const toSafeApprovedUser = (u) =>
  u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone } : null;

export const index = async (req, res) => {
  try {
    const admissions = await models.AdmissionApplication.findAll({
      include: [{ model: models.Course, attributes: ['id', 'title', 'slug'] }],
      order: [['createdAt', 'DESC']],
    });

    const data = admissions.map(a => {
      const json = a.toJSON();
      const courseTitle = json.course?.title || json.Course?.title || null;
      if (!courseTitle && json.course_id) {
        console.warn(`Admission #${json.id}: course_id=${json.course_id} but course data is missing`);
      }
      json.course_title = courseTitle;
      return json;
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admissions' });
  }
};

export const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password } = req.body || {};

    const result = await AdmissionService.approveAdmission({ admissionId: id, email, password });

    res.json({
      message: 'Admission approved successfully',
      data: { admission: result.admission, user: toSafeApprovedUser(result.user), student: result.student },
    });
  } catch (error) {
    const { status, message } = responseForError(error, 'AdmissionManagerController.approve error:');
    res.status(status).json({ message });
  }
};

export const bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    const statusMap = { approve: 'approved', reject: 'rejected', hold: 'hold', approved: 'approved', rejected: 'rejected' };
    const status = statusMap[action];

    if (!status) {
      return res.status(400).json({ message: 'Invalid action. Use: approve, reject, hold' });
    }

    const admissions = await models.AdmissionApplication.findAll({
      where: { id: { [Op.in]: ids } },
    });

    const validStatuses = status === 'hold' ? ['pending'] : ['pending', 'hold'];
    const validAdmissions = admissions.filter(a => validStatuses.includes(a.status));
    const validIds = validAdmissions.map(a => a.id);

    if (validIds.length === 0) {
      return res.status(400).json({ message: `No applicable admissions found for ${action}` });
    }

    const apply = {
      approved: AdmissionService.approveAdmission,
      rejected: AdmissionService.rejectAdmission,
      hold: AdmissionService.holdAdmission,
    };

    let succeeded = 0;
    let failed = 0;
    for (const admission of validAdmissions) {
      try {
        await apply[status]({ admissionId: admission.id });
        succeeded++;
      } catch (error) {
        failed++;
        console.error(`Bulk ${action} failed for admission #${admission.id}:`, error.message);
      }
    }

    res.json({
      message: failed > 0
        ? `${succeeded} admission(s) updated to ${status}, ${failed} failed`
        : `${succeeded} admission(s) updated to ${status}`,
    });
  } catch (error) {
    console.error('Bulk action failed:', error);
    res.status(500).json({ message: 'Bulk action failed' });
  }
};

export const singleAction = async (req, res) => {
  try {
    const { id, action } = req.params;

    const statusMap = { reject: 'rejected', hold: 'hold' };
    const status = statusMap[action];

    if (!status) {
      return res.status(400).json({ message: 'Invalid action. Use: reject, hold' });
    }

    if (status === 'rejected') {
      await AdmissionService.rejectAdmission({ admissionId: id });
    } else {
      await AdmissionService.holdAdmission({ admissionId: id });
    }

    res.json({
      message: `Admission ${status === 'rejected' ? 'rejected' : 'put on hold'} successfully`,
    });
  } catch (error) {
    const { status, message } = responseForError(error, `Failed to ${req.params.action} admission:`);
    res.status(status).json({ message });
  }
};
