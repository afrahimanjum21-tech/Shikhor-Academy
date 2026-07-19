import models from '../../models/index.js';

export const index = async (req, res) => {
  try {
    const { student_id } = req.query;

    const whereClause = {};
    if (student_id) {
      whereClause.student_id = student_id;
    }

    const documents = await models.StudentDocument.findAll({
      where: whereClause,
      include: [{ model: models.Student }],
      order: [['created_at', 'DESC']],
    });

    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const { student_id, name, type } = req.body;

    if (!student_id) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const student = await models.Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const file_path = req.file.path.replace(/\\/g, '/');
    const original_name = req.file.originalname;
    const mime_type = req.file.mimetype;

    const document = await models.StudentDocument.create({
      student_id,
      name: name || original_name,
      type,
      file_path,
      original_name,
      mime_type,
    });

    res.status(201).json({ message: 'Document uploaded successfully', data: document });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const document = await models.StudentDocument.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await document.destroy();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
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
      order: [['created_at', 'DESC']],
    });

    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
};
