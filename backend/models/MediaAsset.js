import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MediaAsset = sequelize.define('MediaAsset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  folder: { type: DataTypes.STRING, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING },
  mime_type: { type: DataTypes.STRING },
  size: { type: DataTypes.INTEGER, defaultValue: 0 },
  data: { type: DataTypes.BLOB('long'), allowNull: false },
}, {
  indexes: [
    {
      unique: true,
      fields: ['folder', 'filename'],
    },
  ],
});

export default MediaAsset;
