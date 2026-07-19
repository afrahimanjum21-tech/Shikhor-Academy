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
});

Payment.associate = (models) => {
  Payment.belongsTo(models.Student, { foreignKey: 'student_id' });
};

export default Payment;
