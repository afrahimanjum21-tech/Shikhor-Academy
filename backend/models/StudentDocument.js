import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentDocument = sequelize.define('StudentDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING(50) },
  file_path: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING },
  mime_type: { type: DataTypes.STRING(50) },
});

StudentDocument.associate = (models) => {
  StudentDocument.belongsTo(models.Student, { foreignKey: 'student_id' });
};

export default StudentDocument;
