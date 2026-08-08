import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import NotificationService from '../../services/NotificationService.js';
import { resolveStudentAccess, isUnlocked, normalizeAccessType } from '../../services/accessControl.js';

const normalizeId = (value) => {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const buildAccess = async (body) => {
  const accessType = normalizeAccessType(body.access_type);

  if (accessType === 'batch') {
    const batchId = normalizeId(body.batch_id);
    if (batchId === null) return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
    const batch = await models.Batch.findByPk(batchId);
    if (!batch) return { error: 'Selected batch does not exist' };
    return { access_type: accessType, batch_id: batchId, course_id: null, class_name: null };
  }

  if (accessType === 'course') {
    const courseId = normalizeId(body.course_id);
    if (courseId === null) return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
    const course = await models.Course.findByPk(courseId);
    if (!course) return { error: 'Selected course does not exist' };
    return { access_type: accessType, batch_id: null, course_id: courseId, class_name: null };
  }

  if (accessType === 'class') {
    return {
      access_type: accessType,
      batch_id: null,
      course_id: null,
      class_name: String(body.class_name || '').trim() || null,
    };
  }

  return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
};

const materialInclude = [
  { model: models.Batch, attributes: ['id', 'name'] },
  { model: models.Course, attributes: ['id', 'title'] },
  { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
];

export const publicIndex = async (req, res) => {
  try {
    const { type, subject, batch_id } = req.query;
    const student = await resolveStudentAccess(req);

    const where = {};
    if (type) where.type = type;
    if (subject) where.subject = subject;
    if (batch_id) where.batch_id = batch_id;

    const materials = await models.StudyMaterial.findAll({
      where,
      include: materialInclude,
      order: [['createdAt', 'DESC']],
    });

    materials.forEach(m => {
      m.dataValues.is_unlocked = isUnlocked(m, student);
      // Locked content must not leak its file/link pointer - is_unlocked alone
      // was purely cosmetic because the URL was still returned to everyone.
      if (!m.dataValues.is_unlocked) {
        m.dataValues.file_path = null;
        m.dataValues.url = null;
      }
    });

    res.json({ data: materials });
  } catch (error) {
    console.error('ResourceController.publicIndex error:', error);
    res.status(500).json({ message: 'Failed to fetch materials' });
  }
};

export const uploadMaterial = async (req, res) => {
  try {
    const { title, description, batch_id, subject, type, url } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    const access = await buildAccess(req.body);
    if (access.error) {
      return res.status(400).json({ message: access.error });
    }

    let file_path = null;
    let file_type = null;
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'materials', folder: 'general' });
      file_path = uploadResult.url;
      file_type = req.file.mimetype;
    }

    const material = await models.StudyMaterial.create({
      title,
      description: description || null,
      batch_id: batch_id || null,
      subject: subject || null,
      file_path,
      file_type,
      uploaded_by: req.user.id,
      type: type || null,
      url: url || null,
      ...access,
    });

    const result = await models.StudyMaterial.findByPk(material.id, {
      include: materialInclude,
    });

    try {
      if (material.access_type === 'batch' && material.batch_id) {
        await NotificationService.createForBatch({
          batchId: material.batch_id,
          type: 'material',
          title: 'New Study Material',
          body: `"${material.title}" has been uploaded${material.subject ? ` (${material.subject})` : ''}.`,
          actionUrl: '/student/library',
          actionLabel: 'View Library',
        });
      } else if (material.access_type === 'all') {
        await NotificationService.createForAllStudents({
          type: 'material',
          title: 'New Study Material',
          body: `"${material.title}" has been uploaded${material.subject ? ` (${material.subject})` : ''}.`,
          actionUrl: '/student/library',
          actionLabel: 'View Library',
        });
      } else if (material.access_type === 'course' && material.course_id) {
        const batchIds = await models.Batch.findAll({
          where: { course_id: material.course_id },
          attributes: ['id'],
        }).then(rows => rows.map(r => r.id));
        if (batchIds.length > 0) {
          const students = await models.Student.findAll({
            where: { current_batch_id: { [Op.in]: batchIds } },
            attributes: ['user_id'],
          });
          await NotificationService.createForStudents({
            userIds: students.map(s => s.user_id),
            type: 'material',
            title: 'New Study Material',
            body: `"${material.title}" has been uploaded${material.subject ? ` (${material.subject})` : ''}.`,
            actionUrl: '/student/library',
            actionLabel: 'View Library',
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to send material notification:', notifErr);
    }

    res.status(201).json({ message: 'Material uploaded successfully', data: result });
  } catch (error) {
    console.error('ResourceController.uploadMaterial error:', error);
    res.status(500).json({ message: 'Failed to upload material' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, url } = req.body;

    const material = await models.StudyMaterial.findByPk(id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const access = await buildAccess(req.body);
    if (access.error) {
      return res.status(400).json({ message: access.error });
    }

    const hasAccessFields = ['access_type', 'batch_id', 'course_id', 'class_name']
      .some(key => req.body[key] !== undefined);

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (url !== undefined) updates.url = url;
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'materials', folder: 'general' });
      if (material.file_path) {
        await MediaDeleteService.deleteByUrl(material.file_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      updates.file_path = uploadResult.url;
      updates.file_type = req.file.mimetype;
    }
    // Only touch access targeting when the request actually includes access
    // fields - otherwise a title-only edit would reset to 'all' and ungate it.
    if (hasAccessFields) Object.assign(updates, access);

    await material.update(updates);

    const result = await models.StudyMaterial.findByPk(id, {
      include: materialInclude,
    });

    res.json({ message: 'Material updated successfully', data: result });
  } catch (error) {
    console.error('ResourceController.update error:', error);
    res.status(500).json({ message: 'Failed to update material' });
  }
};

export const destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await models.StudyMaterial.findByPk(id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.file_path) {
      await MediaDeleteService.deleteByUrl(material.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await material.destroy();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('ResourceController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete material' });
  }
};
