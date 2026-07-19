import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  type: { type: DataTypes.STRING(50) },
  icon: { type: DataTypes.STRING(20) },
  title: { type: DataTypes.STRING },
  body: { type: DataTypes.TEXT },
  action_url: { type: DataTypes.STRING },
  action_label: { type: DataTypes.STRING },
  level: { type: DataTypes.STRING(20) },
  read_at: { type: DataTypes.DATE },
});

Notification.associate = (models) => {
  Notification.belongsTo(models.User, { foreignKey: 'user_id' });
};

export default Notification;
