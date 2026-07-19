import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultySocialLink = sequelize.define('FacultySocialLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  platform: { type: DataTypes.STRING(50) },
  url: { type: DataTypes.STRING },
});

FacultySocialLink.associate = (models) => {
  FacultySocialLink.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
};

export default FacultySocialLink;
