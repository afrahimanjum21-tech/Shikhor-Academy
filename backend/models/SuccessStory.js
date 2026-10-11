import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SuccessStory = sequelize.define('SuccessStory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_name: { type: DataTypes.STRING, allowNull: false },
  achievement: { type: DataTypes.STRING },
  batch_info: { type: DataTypes.STRING },
  story: { type: DataTypes.TEXT },
  message: { type: DataTypes.TEXT },
  photo: { type: DataTypes.STRING },
  slug: { type: DataTypes.STRING(255) },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

export default SuccessStory;