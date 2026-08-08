import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ElearningVideo = sequelize.define('ElearningVideo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  teacher: { type: DataTypes.STRING },
  duration: { type: DataTypes.STRING(20) },
  video_url: { type: DataTypes.STRING, allowNull: false },
  platform: { type: DataTypes.STRING(20) },
  video_id: { type: DataTypes.STRING },
  thumbnail_path: { type: DataTypes.STRING },
  is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  batch_id: { type: DataTypes.INTEGER, allowNull: true },
  access_type: { type: DataTypes.STRING(20), defaultValue: 'all' },
  course_id: { type: DataTypes.INTEGER, allowNull: true },
  class_name: { type: DataTypes.STRING, allowNull: true },
});

ElearningVideo.associate = (models) => {
  ElearningVideo.belongsTo(models.Batch, { foreignKey: 'batch_id' });
  ElearningVideo.belongsTo(models.Course, { foreignKey: 'course_id' });
};

export default ElearningVideo;
