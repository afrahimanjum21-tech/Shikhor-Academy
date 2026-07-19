import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyQualification = sequelize.define('FacultyQualification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  degree: { type: DataTypes.STRING },
  institution: { type: DataTypes.STRING },
  field_of_study: { type: DataTypes.STRING },
  passing_year: { type: DataTypes.STRING(10) },
  grade: { type: DataTypes.STRING(10) },
});

FacultyQualification.associate = (models) => {
  FacultyQualification.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
};

export default FacultyQualification;
