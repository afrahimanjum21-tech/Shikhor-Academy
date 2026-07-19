import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyBatch = sequelize.define('FacultyBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING },
});

FacultyBatch.associate = (models) => {
  FacultyBatch.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
  FacultyBatch.belongsTo(models.Batch, { foreignKey: 'batch_id' });
};

export default FacultyBatch;
