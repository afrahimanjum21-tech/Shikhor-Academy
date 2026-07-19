import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Exam = sequelize.define('Exam', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  course_id: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING, allowNull: false },
  subjects: { type: DataTypes.JSON },
  subject_marks: { type: DataTypes.JSON },
  total_marks: { type: DataTypes.INTEGER },
  date: { type: DataTypes.DATEONLY },
  type: { type: DataTypes.STRING(20) },
  is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
});

Exam.associate = (models) => {
  Exam.belongsTo(models.Course, { foreignKey: 'course_id' });
  Exam.hasMany(models.ExamResult, { foreignKey: 'exam_id' });
};

export default Exam;
