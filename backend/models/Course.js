import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Course = sequelize.define('Course', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  category_id: { type: DataTypes.INTEGER },
  fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discount_price: { type: DataTypes.DECIMAL(10, 2) },
  thumbnail: { type: DataTypes.TEXT },
  features: { type: DataTypes.JSON },
  duration: { type: DataTypes.STRING },
  seats: { type: DataTypes.INTEGER },
  teacher_name: { type: DataTypes.STRING },
  class_mode: { type: DataTypes.STRING(20) },
  sorting_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

Course.associate = (models) => {
  Course.belongsTo(models.CourseCategory, { foreignKey: 'category_id' });
  Course.hasMany(models.Batch, { foreignKey: 'course_id' });
  Course.hasMany(models.Exam, { foreignKey: 'course_id' });
  Course.hasMany(models.AdmissionApplication, { foreignKey: 'course_id' });
};

export default Course;
