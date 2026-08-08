import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.INTEGER },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  subject: { type: DataTypes.STRING },
  due_date: { type: DataTypes.DATEONLY },
  attachment_path: { type: DataTypes.STRING },
   total_marks: { type: DataTypes.INTEGER },
}, {
  indexes: [
    { fields: ['teacher_id'] },
    { fields: ['batch_id'] },
  ],
});

Assignment.associate = (models) => {
  Assignment.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'Teacher' });
  Assignment.belongsTo(models.Batch, { foreignKey: 'batch_id' });
  Assignment.hasMany(models.AssignmentSubmission, { foreignKey: 'assignment_id' });
};

export default Assignment;
