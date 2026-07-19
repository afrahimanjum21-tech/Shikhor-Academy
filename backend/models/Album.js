import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Album = sequelize.define('Album', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  thumbnail: { type: DataTypes.STRING },
});

Album.associate = (models) => {
  Album.hasMany(models.GalleryImage, { foreignKey: 'album_id' });
};

export default Album;
