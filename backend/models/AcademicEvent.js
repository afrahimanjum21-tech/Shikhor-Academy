import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AcademicEvent = sequelize.define('AcademicEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  type: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT },
});

export default AcademicEvent;
