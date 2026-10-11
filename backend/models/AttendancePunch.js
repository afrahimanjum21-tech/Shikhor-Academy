import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Raw punch log from the biometric/fingerprint device (source of truth). Each
// row is one scan; the ingestion API (routes/integrations.js) de-duplicates on
// the unique (device_id, device_user_id, punched_at) and then maps it to a
// student + Attendance row. Keeping the raw log lets us re-process if the
// session/late rules are tuned later.
const AttendancePunch = sequelize.define('AttendancePunch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  device_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
  device_user_id: { type: DataTypes.STRING(64), allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: true },
  punched_at: { type: DataTypes.DATE, allowNull: false },
  direction: { type: DataTypes.STRING(10), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'received' },
  attendance_id: { type: DataTypes.INTEGER, allowNull: true },
  raw: { type: DataTypes.JSON, allowNull: true },
}, {
  indexes: [
    { unique: true, fields: ['device_id', 'device_user_id', 'punched_at'], name: 'attendance_punch_dedupe_unique' },
    { fields: ['student_id'] },
    { fields: ['status'] },
  ],
});

AttendancePunch.associate = (models) => {
  AttendancePunch.belongsTo(models.Student, { foreignKey: 'student_id' });
};

export default AttendancePunch;
