import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER },
  batch_id: { type: DataTypes.INTEGER },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  session: { type: DataTypes.ENUM('morning', 'evening') },
  status: { type: DataTypes.STRING(20), defaultValue: 'present' },
  punch_in_at: { type: DataTypes.TIME },
  punch_out_at: { type: DataTypes.TIME },
  leave_status: { type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected') },
  leave_reason: { type: DataTypes.TEXT },
  leave_requested_at: { type: DataTypes.DATE },
  leave_approved_at: { type: DataTypes.DATE },
   leave_approved_by: { type: DataTypes.INTEGER },
}, {
  indexes: [
    { fields: ['student_id'] },
    { fields: ['date'] },
    { fields: ['course_id'] },
    { fields: ['student_id', 'date'] },
    { fields: ['batch_id'] },
    { unique: true, fields: ['student_id', 'batch_id', 'date', 'session'] },
  ],
});

Attendance.associate = (models) => {
  Attendance.belongsTo(models.Student, { foreignKey: 'student_id' });
  Attendance.belongsTo(models.User, { foreignKey: 'leave_approved_by', as: 'Approver' });
};

export default Attendance;
