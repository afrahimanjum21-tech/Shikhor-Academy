import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  student_id_card_no: { type: DataTypes.STRING, unique: true },
  admission_id: { type: DataTypes.INTEGER },
  current_batch_id: { type: DataTypes.INTEGER },
  guardian_phone: { type: DataTypes.STRING(20) },
  admission_date: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.STRING(10) },
  nationality: { type: DataTypes.STRING(50) },
  religion: { type: DataTypes.STRING(50) },
  blood_group: { type: DataTypes.STRING(10) },
  dob: { type: DataTypes.DATEONLY },
  father_name: { type: DataTypes.STRING },
  father_phone: { type: DataTypes.STRING(20) },
  father_occupation: { type: DataTypes.STRING },
  father_nid: { type: DataTypes.STRING(50) },
  mother_name: { type: DataTypes.STRING },
  mother_phone: { type: DataTypes.STRING(20) },
  mother_occupation: { type: DataTypes.STRING },
  mother_nid: { type: DataTypes.STRING(50) },
  present_address: { type: DataTypes.TEXT },
  permanent_address: { type: DataTypes.TEXT },
  emergency_contact_name: { type: DataTypes.STRING },
  emergency_contact_phone: { type: DataTypes.STRING(20) },
  emergency_contact_relation: { type: DataTypes.STRING },
  last_school: { type: DataTypes.STRING },
  jsc_roll: { type: DataTypes.STRING(20) },
  jsc_registration: { type: DataTypes.STRING(20) },
  jsc_gpa: { type: DataTypes.STRING(10) },
  ssc_roll: { type: DataTypes.STRING(20) },
  ssc_registration: { type: DataTypes.STRING(20) },
  ssc_gpa: { type: DataTypes.STRING(10) },
  shift: { type: DataTypes.STRING(20) },
  section: { type: DataTypes.STRING(20) },
  group_name: { type: DataTypes.STRING(50) },
  subject: { type: DataTypes.STRING },
});

Student.associate = (models) => {
  Student.belongsTo(models.User, { foreignKey: 'user_id' });
  Student.belongsTo(models.Batch, { foreignKey: 'current_batch_id' });
  Student.belongsTo(models.AdmissionApplication, { foreignKey: 'admission_id' });
  Student.hasMany(models.ExamResult, { foreignKey: 'student_id' });
  Student.hasMany(models.AssignmentSubmission, { foreignKey: 'student_id' });
  Student.hasMany(models.StudentDocument, { foreignKey: 'student_id' });
  Student.hasMany(models.Attendance, { foreignKey: 'student_id' });
  Student.hasMany(models.Payment, { foreignKey: 'student_id' });
};

export default Student;
