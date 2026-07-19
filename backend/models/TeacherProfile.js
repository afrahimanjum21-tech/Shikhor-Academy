import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherProfile = sequelize.define('TeacherProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  designation: { type: DataTypes.STRING },
  subject: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT },
  joining_date: { type: DataTypes.DATEONLY },
});

TeacherProfile.associate = (models) => {
  TeacherProfile.belongsTo(models.User, { foreignKey: 'user_id' });
};

export default TeacherProfile;
