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
      'email_enabled', 'email_provider', 'email_api_key', 'email_from',
      'admission_email', 'messages_email',
    ];
    sensitiveFields.forEach(field => { delete data[field]; });

    const [studentCount, teacherCount, courseCount] = await Promise.all([
      models.User.count({ where: { role: 'student' } }),
      models.User.count({ where: { role: 'teacher' } }),
      models.Course.count({ where: { is_active: true } }),
    ]);

    data.real_student_count = studentCount;
    data.real_teacher_count = teacherCount;
    data.real_course_count = courseCount;

    res.json(data);
  } catch (error) {
    console.error('SiteSetting show error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
