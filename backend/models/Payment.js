import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.STRING(20) },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  trx_id: { type: DataTypes.STRING },
  method: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.ENUM('paid', 'pending', 'due'), defaultValue: 'due' },
  date: { type: DataTypes.DATEONLY },
  ssl_sessionkey: { type: DataTypes.STRING },
  ssl_val_id: { type: DataTypes.STRING },
  ssl_store_amount: { type: DataTypes.DECIMAL(10, 2) },
  ssl_card_type: { type: DataTypes.STRING(50) },
  ssl_card_no: { type: DataTypes.STRING(20) },
}, {
  indexes: [
    // NOT unique: multi-month payments share one trx_id across per-month
    // rows (one gateway charge for several months). Uniqueness of a paid
    // month is enforced by the (student_id, month) index instead.
    { fields: ['trx_id'] },
    { unique: true, fields: ['student_id', 'month'] },
    { fields: ['status'] },
  ],
});

Payment.associate = (models) => {
  // Aliased lowercase 'student' so API consumers (admin UI) can read pay.student.user.name
  Payment.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
};

export default Payment;
