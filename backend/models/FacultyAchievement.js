import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyAchievement = sequelize.define('FacultyAchievement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  date: { type: DataTypes.DATEONLY },
  category: { type: DataTypes.STRING(50) },
});

FacultyAchievement.associate = (models) => {
  FacultyAchievement.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
};

export default FacultyAchievement;
