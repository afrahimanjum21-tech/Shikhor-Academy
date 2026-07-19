import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GalleryImage = sequelize.define('GalleryImage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  album_id: { type: DataTypes.INTEGER },
  image_path: { type: DataTypes.STRING, allowNull: false },
  caption: { type: DataTypes.STRING },
});

GalleryImage.associate = (models) => {
  GalleryImage.belongsTo(models.Album, { foreignKey: 'album_id' });
};

export default GalleryImage;
