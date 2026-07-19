import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Batch = sequelize.define('Batch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  start_time: { type: DataTypes.STRING },
  end_time: { type: DataTypes.STRING },
  capacity: { type: DataTypes.INTEGER, defaultValue: 30 },
});

Batch.associate = (models) => {
  Batch.belongsTo(models.Course, { foreignKey: 'course_id' });
  Batch.hasMany(models.TeacherBatchAssignment, { foreignKey: 'batch_id' });
  Batch.hasMany(models.Student, { foreignKey: 'current_batch_id' });
  Batch.hasMany(models.Routine, { foreignKey: 'batch_id' });
  Batch.hasMany(models.Assignment, { foreignKey: 'batch_id' });
  Batch.hasMany(models.StudyMaterial, { foreignKey: 'batch_id' });
};

export default Batch;
