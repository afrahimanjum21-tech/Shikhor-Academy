import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

// bcrypt only considers the first 72 bytes of a password. Truncate defensively
// so bcryptjs never receives over-length input from any code path (seed, admin
// create, password change). This is a no-op for normal passwords and matches
// bcrypt's own semantics — every bcrypt implementation discards bytes beyond 72.
function toBcryptSafe(password) {
  if (typeof password !== 'string' || password.length === 0) return password;
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes <= 72) return password;
  return Buffer.from(password, 'utf8').slice(0, 72).toString('utf8');
}

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
  // Incremented on logout and password/credential changes to revoke every
  // previously issued JWT for this account (SEC-5). Tokens embed this value as
  // `tv`; the auth middleware rejects a token whose `tv` no longer matches.
  token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(toBcryptSafe(user.password), 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(toBcryptSafe(user.password), 12);
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
