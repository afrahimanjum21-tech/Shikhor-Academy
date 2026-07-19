import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CourseCategory = sequelize.define('CourseCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  icon: { type: DataTypes.STRING },
  color: { type: DataTypes.STRING(20) },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

CourseCategory.associate = (models) => {
  CourseCategory.hasMany(models.Course, { foreignKey: 'category_id' });
};

export default CourseCategory;
