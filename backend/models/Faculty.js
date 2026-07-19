import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Faculty = sequelize.define('Faculty', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING, allowNull: false },
  employee_id: { type: DataTypes.STRING, unique: true },
  profile_photo_path: { type: DataTypes.STRING },
  cover_photo_path: { type: DataTypes.STRING },
  gender: { type: DataTypes.STRING(10) },
  dob: { type: DataTypes.DATEONLY },
  designation: { type: DataTypes.STRING },
  department_id: { type: DataTypes.INTEGER },
  faculty_category_id: { type: DataTypes.INTEGER },
  specialization: { type: DataTypes.STRING },
  qualification: { type: DataTypes.STRING },
  teaching_experience: { type: DataTypes.STRING },
  biography: { type: DataTypes.TEXT },
  awards: { type: DataTypes.JSON },
  achievements: { type: DataTypes.JSON },
  certifications: { type: DataTypes.JSON },
  publications: { type: DataTypes.JSON },
  research: { type: DataTypes.TEXT },
  official_email: { type: DataTypes.STRING },
  official_phone: { type: DataTypes.STRING(20) },
  public_profile_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  slug: { type: DataTypes.STRING, unique: true },
  meta_title: { type: DataTypes.STRING },
  meta_description: { type: DataTypes.TEXT },
  og_image: { type: DataTypes.STRING },
  user_id: { type: DataTypes.INTEGER },
  deleted_at: { type: DataTypes.DATE },
}, { paranoid: true });

Faculty.associate = (models) => {
  Faculty.belongsTo(models.User, { foreignKey: 'user_id' });
  Faculty.belongsTo(models.Department, { foreignKey: 'department_id' });
  Faculty.belongsTo(models.FacultyCategory, { foreignKey: 'faculty_category_id' });
  Faculty.belongsToMany(models.Subject, { through: models.FacultySubject, foreignKey: 'faculty_id' });
  Faculty.hasMany(models.FacultyQualification, { foreignKey: 'faculty_id' });
  Faculty.hasMany(models.FacultyAchievement, { foreignKey: 'faculty_id' });
  Faculty.hasMany(models.FacultyCertification, { foreignKey: 'faculty_id' });
  Faculty.hasMany(models.FacultySocialLink, { foreignKey: 'faculty_id' });
  Faculty.hasMany(models.FacultyGallery, { foreignKey: 'faculty_id' });
  Faculty.belongsToMany(models.Batch, { through: models.FacultyBatch, foreignKey: 'faculty_id' });
};

export default Faculty;
