import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdmissionApplication = sequelize.define('AdmissionApplication', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING, allowNull: false },
  father_name: { type: DataTypes.STRING },
  mother_name: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  email: { type: DataTypes.STRING },
  dob: { type: DataTypes.DATEONLY },
  address: { type: DataTypes.TEXT },
  course_id: { type: DataTypes.INTEGER },
  photo_path: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'hold'),
    defaultValue: 'pending',
  },
  gender: { type: DataTypes.STRING(10) },
  nationality: { type: DataTypes.STRING(50) },
  religion: { type: DataTypes.STRING(50) },
  blood_group: { type: DataTypes.STRING(10) },
  guardian_phone: { type: DataTypes.STRING(20) },
  guardian_name: { type: DataTypes.STRING },
  guardian_relation: { type: DataTypes.STRING },
  guardian_occupation: { type: DataTypes.STRING },
  guardian_address: { type: DataTypes.TEXT },
  emergency_contact: { type: DataTypes.STRING(20) },
  last_school: { type: DataTypes.STRING },
  jsc_roll: { type: DataTypes.STRING(20) },
  jsc_registration: { type: DataTypes.STRING(20) },
  jsc_gpa: { type: DataTypes.STRING(10) },
  ssc_roll: { type: DataTypes.STRING(20) },
  ssc_registration: { type: DataTypes.STRING(20) },
  ssc_gpa: { type: DataTypes.STRING(10) },
});

AdmissionApplication.associate = (models) => {
  AdmissionApplication.belongsTo(models.Course, { foreignKey: 'course_id' });
};

export default AdmissionApplication;
