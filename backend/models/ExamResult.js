import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ExamResult = sequelize.define('ExamResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  exam_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  marks_details: { type: DataTypes.JSON },
  total_obtained: { type: DataTypes.FLOAT },
  grade: { type: DataTypes.STRING(5) },
  gpa: { type: DataTypes.FLOAT },
  position: { type: DataTypes.INTEGER },
  teacher_comment: { type: DataTypes.TEXT },
});

ExamResult.associate = (models) => {
  ExamResult.belongsTo(models.Exam, { foreignKey: 'exam_id' });
  ExamResult.belongsTo(models.Student, { foreignKey: 'student_id' });
};

export default ExamResult;
