import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

export const index = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.params.id } });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const documents = await models.StudentDocument.findAll({
      where: { student_id: student.id },
      include: [{ model: models.Student }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

export const store = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const student = await models.Student.findOne({ where: { user_id: req.params.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const uploadResult = await MediaService.upload(req.file, { bucket: 'documents', folder: 'students' });
    const file_path = uploadResult.url;
    const original_name = req.file.originalname;
    const mime_type = req.file.mimetype;

    const document = await models.StudentDocument.create({
      student_id: student.id,
      name: name || original_name,
      type,
      file_path,
      original_name,
      mime_type,
    });

    res.status(201).json({ message: 'Document uploaded successfully', data: document });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload document' });
  }
};

export const destroy = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.params.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const document = await models.StudentDocument.findOne({
      where: { id: req.params.documentId, student_id: student.id },
    });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.file_path) {
      await MediaDeleteService.deleteByUrl(document.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await document.destroy();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

export const studentDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const student = await models.Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const documents = await models.StudentDocument.findAll({
      where: { student_id: student.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};
