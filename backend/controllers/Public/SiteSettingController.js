import { Op } from 'sequelize';
import models from '../../models/index.js';

export async function show(req, res) {
  try {
    const setting = await models.SiteSetting.findByPk(1);

    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const data = setting.toJSON();

    const sensitiveFields = [
      'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
      'smtp_encryption', 'smtp_from_address', 'smtp_from_name',
    ];
    sensitiveFields.forEach(field => { delete data[field]; });

    const studentCount = await models.Student.count({
      include: [{
        model: models.User,
        as: 'User',
        where: { is_active: true },
      }],
    });

    const teacherCount = await models.TeacherProfile.count({
      include: [{
        model: models.User,
        as: 'User',
        where: { is_active: true },
      }],
    });

    data.real_student_count = studentCount;
    data.real_teacher_count = teacherCount;

    res.json(data);
  } catch (error) {
    console.error('SiteSetting show error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
