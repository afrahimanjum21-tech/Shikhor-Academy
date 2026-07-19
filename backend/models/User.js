import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'accountant', 'teacher', 'student'),
    defaultValue: 'student',
  },
  phone: { type: DataTypes.STRING(20) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  profile_photo_path: { type: DataTypes.STRING },
  deleted_at: { type: DataTypes.DATE },
}, {
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

User.associate = (models) => {
  User.hasOne(models.Student, { foreignKey: 'user_id' });
  User.hasOne(models.TeacherProfile, { foreignKey: 'user_id' });
  User.hasOne(models.Faculty, { foreignKey: 'user_id' });
  User.hasMany(models.TeacherBatchAssignment, { foreignKey: 'teacher_id' });
  User.hasMany(models.Assignment, { foreignKey: 'teacher_id' });
};

export default User;
