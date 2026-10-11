import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherBatchAssignment = sequelize.define('TeacherBatchAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING },
}, {
  indexes: [
    { fields: ['teacher_id'] },
    { fields: ['batch_id'] },
    { unique: true, fields: ['teacher_id', 'batch_id', 'subject'] },
  ],
});

TeacherBatchAssignment.associate = (models) => {
  TeacherBatchAssignment.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'Teacher' });
  TeacherBatchAssignment.belongsTo(models.Batch, { foreignKey: 'batch_id' });
};

export default TeacherBatchAssignment;
