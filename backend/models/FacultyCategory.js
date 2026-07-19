import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyCategory = sequelize.define('FacultyCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
});

FacultyCategory.associate = (models) => {
  FacultyCategory.hasMany(models.Faculty, { foreignKey: 'faculty_category_id' });
};

export default FacultyCategory;
