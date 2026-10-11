import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  submission_file_path: { type: DataTypes.STRING },
  submission_text: { type: DataTypes.TEXT },
  marks_obtained: { type: DataTypes.FLOAT },
  feedback: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(20), defaultValue: 'submitted' },
   submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  indexes: [
    { unique: true, fields: ['assignment_id', 'student_id'] },
    { fields: ['assignment_id'] },
    { fields: ['student_id'] },
    { fields: ['status'] },
  ],
});

AssignmentSubmission.associate = (models) => {
  AssignmentSubmission.belongsTo(models.Assignment, { foreignKey: 'assignment_id' });
  AssignmentSubmission.belongsTo(models.Student, { foreignKey: 'student_id' });
};

export default AssignmentSubmission;
