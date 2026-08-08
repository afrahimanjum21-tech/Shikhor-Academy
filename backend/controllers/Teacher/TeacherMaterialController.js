import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import NotificationService from '../../services/NotificationService.js';

export const index = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id } = req.query;

    const batchIds = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      attributes: ['batch_id'],
    }).then(rows => rows.map(r => r.batch_id));

    const where = { uploaded_by: teacherId };
    if (batch_id) {
      if (!batchIds.includes(Number(batch_id))) {
        return res.status(403).json({ message: 'You are not assigned to this batch' });
      }
      where.batch_id = batch_id;
    } else {
      where.batch_id = { [Op.in]: batchIds };
    }

    const materials = await models.StudyMaterial.findAll({
      where,
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: materials });
  } catch (error) {
    console.error('TeacherMaterialController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch materials' });
  }
};

export const store = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, description, batch_id, subject, type, url } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    if (batch_id) {
      const assignment = await models.TeacherBatchAssignment.findOne({
        where: { teacher_id: teacherId, batch_id },
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this batch' });
      }
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
      uploaded_by: teacherId,
      type: type || null,
      url: url || null,
    });

    const result = await models.StudyMaterial.findByPk(material.id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
    });

    try {
      if (material.batch_id) {
        await NotificationService.createForBatch({
          batchId: material.batch_id,
          type: 'material',
          title: 'New Study Material',
          body: `"${material.title}" has been uploaded${subject ? ` (${subject})` : ''}.`,
          actionUrl: '/student/library',
          actionLabel: 'View Library',
        });
      } else {
        await NotificationService.createForAllStudents({
          type: 'material',
          title: 'New Study Material',
          body: `"${material.title}" has been uploaded${subject ? ` (${subject})` : ''}.`,
          actionUrl: '/student/library',
          actionLabel: 'View Library',
        });
      }
    } catch (notifErr) {
      console.error('Failed to send material notification:', notifErr);
    }

    res.status(201).json({ message: 'Material created successfully', data: result });
  } catch (error) {
    console.error('TeacherMaterialController.store error:', error);
    res.status(500).json({ message: 'Failed to create material' });
  }
};

export const update = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { title, description, batch_id, subject, type, url } = req.body;

    const material = await models.StudyMaterial.findOne({
      where: { id, uploaded_by: teacherId },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found or not owned by you' });
    }

    if (batch_id) {
      const assignment = await models.TeacherBatchAssignment.findOne({
        where: { teacher_id: teacherId, batch_id },
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this batch' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (batch_id !== undefined) updates.batch_id = batch_id;
    if (subject !== undefined) updates.subject = subject;
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

    await material.update(updates);

    const result = await models.StudyMaterial.findByPk(id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
    });

    res.json({ message: 'Material updated successfully', data: result });
  } catch (error) {
    console.error('TeacherMaterialController.update error:', error);
    res.status(500).json({ message: 'Failed to update material' });
  }
};

export const destroy = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const material = await models.StudyMaterial.findOne({
      where: { id, uploaded_by: teacherId },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found or not owned by you' });
    }

    if (material.file_path) {
      await MediaDeleteService.deleteByUrl(material.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await material.destroy();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('TeacherMaterialController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete material' });
  }
};
