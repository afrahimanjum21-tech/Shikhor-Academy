import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyGallery = sequelize.define('FacultyGallery', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  image_path: { type: DataTypes.STRING, allowNull: false },
  caption: { type: DataTypes.STRING },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
});

FacultyGallery.associate = (models) => {
  FacultyGallery.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
};

export default FacultyGallery;
