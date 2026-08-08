import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudyMaterial = sequelize.define('StudyMaterial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  batch_id: { type: DataTypes.INTEGER },
  subject: { type: DataTypes.STRING },
  file_path: { type: DataTypes.STRING },
  file_type: { type: DataTypes.STRING(50) },
  uploaded_by: { type: DataTypes.INTEGER },
  type: { type: DataTypes.STRING(50) },
  url: { type: DataTypes.STRING },
  access_type: { type: DataTypes.STRING(20), defaultValue: 'all' },
  course_id: { type: DataTypes.INTEGER, allowNull: true },
  class_name: { type: DataTypes.STRING, allowNull: true },
});

StudyMaterial.associate = (models) => {
  StudyMaterial.belongsTo(models.Batch, { foreignKey: 'batch_id' });
  StudyMaterial.belongsTo(models.Course, { foreignKey: 'course_id' });
  StudyMaterial.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'Uploader' });
};

export default StudyMaterial;
