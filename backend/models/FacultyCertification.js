import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FacultyCertification = sequelize.define('FacultyCertification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  faculty_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING },
  issuing_organization: { type: DataTypes.STRING },
  issue_date: { type: DataTypes.DATEONLY },
  expiry_date: { type: DataTypes.DATEONLY },
  certificate_url: { type: DataTypes.STRING },
});

FacultyCertification.associate = (models) => {
  FacultyCertification.belongsTo(models.Faculty, { foreignKey: 'faculty_id' });
};

export default FacultyCertification;
