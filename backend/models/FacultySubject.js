import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultySubject = sequelize.define('FacultySubject', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
});

FacultySubject.associate = (models) => {
  FacultySubject.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
  FacultySubject.belongsTo(models.Subject, { foreignKey: 'subject_id' });
};

export default FacultySubject;
