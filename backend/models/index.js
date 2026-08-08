import sequelize from '../config/database.js';
import User from './User.js';
import Student from './Student.js';
import TeacherProfile from './TeacherProfile.js';
import Batch from './Batch.js';
import Course from './Course.js';
import CourseCategory from './CourseCategory.js';
import AdmissionApplication from './AdmissionApplication.js';
import ContactMessage from './ContactMessage.js';
import Exam from './Exam.js';
import ExamResult from './ExamResult.js';
import Attendance from './Attendance.js';
import Routine from './Routine.js';
import Assignment from './Assignment.js';
import AssignmentSubmission from './AssignmentSubmission.js';
import StudyMaterial from './StudyMaterial.js';
import AcademicEvent from './AcademicEvent.js';
import Payment from './Payment.js';
import PaymentSetting from './PaymentSetting.js';
import ElearningVideo from './ElearningVideo.js';
import TeacherBatchAssignment from './TeacherBatchAssignment.js';
import Notice from './Notice.js';
import Notification from './Notification.js';
import Album from './Album.js';
import GalleryImage from './GalleryImage.js';
import SiteSetting from './SiteSetting.js';
import StudentDocument from './StudentDocument.js';
import Faculty from './Faculty.js';
import FacultyCategory from './FacultyCategory.js';
import Department from './Department.js';
import Subject from './Subject.js';
import FacultySubject from './FacultySubject.js';
import FacultyQualification from './FacultyQualification.js';
import FacultyAchievement from './FacultyAchievement.js';
import FacultyCertification from './FacultyCertification.js';
import FacultySocialLink from './FacultySocialLink.js';
import FacultyGallery from './FacultyGallery.js';
import FacultyBatch from './FacultyBatch.js';
import MediaAsset from './MediaAsset.js';

const models = {
  User, Student, TeacherProfile, Batch, Course, CourseCategory,
  AdmissionApplication, ContactMessage, Exam, ExamResult,
  Attendance, Routine, Assignment, AssignmentSubmission, StudyMaterial,
  AcademicEvent, Payment, PaymentSetting, ElearningVideo,
  TeacherBatchAssignment, Notice, Notification, Album, GalleryImage,
  SiteSetting, StudentDocument, Faculty, FacultyCategory, Department,
  Subject, FacultySubject, FacultyQualification, FacultyAchievement,
  FacultyCertification, FacultySocialLink, FacultyGallery, FacultyBatch,
  MediaAsset,
};

Object.values(models).forEach(model => {
  if (model.associate) model.associate(models);
});

export { sequelize };
export default models;
