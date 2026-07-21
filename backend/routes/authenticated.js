import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import * as AuthController from '../controllers/Auth/AuthController.js';
import * as NotificationController from '../controllers/NotificationController.js';
import * as NotificationCountsController from '../controllers/NotificationCountsController.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please try again later' },
});

router.use(authenticate);
router.use(authLimiter);

router.post('/logout', AuthController.logout);
router.get('/user', AuthController.user);

router.get('/notifications/counts', NotificationCountsController.counts);
router.get('/notifications', NotificationController.index);
router.get('/notifications/unread-count', NotificationController.unreadCount);
router.post('/notifications/:id/read', NotificationController.markAsRead);
router.post('/notifications/read-all', NotificationController.markAllAsRead);
router.post('/notifications/read-by-type', NotificationController.markReadByType);
router.get('/recent-activity', NotificationController.recentActivity);

// Admin routes
import * as DashboardController from '../controllers/Admin/DashboardController.js';
import * as AdminUserController from '../controllers/Admin/AdminUserController.js';
import * as AdmissionManagerController from '../controllers/Admin/AdmissionManagerController.js';
import * as CourseController from '../controllers/Admin/CourseController.js';
import * as BatchController from '../controllers/Admin/BatchController.js';
import * as TeacherController from '../controllers/Admin/TeacherController.js';
import * as GalleryController from '../controllers/Admin/GalleryController.js';
import * as ElearningVideoController from '../controllers/Admin/ElearningVideoController.js';
import * as NoticeController from '../controllers/Admin/NoticeController.js';
import * as ExamController from '../controllers/Admin/ExamController.js';
import * as AttendanceController from '../controllers/Admin/AttendanceController.js';
import * as RoutineController from '../controllers/Admin/RoutineController.js';
import * as PaymentController from '../controllers/Admin/PaymentController.js';
import * as PaymentSettingController from '../controllers/Admin/PaymentSettingController.js';
import * as EventController from '../controllers/Admin/EventController.js';
import * as CourseCategoryController from '../controllers/Admin/CourseCategoryController.js';
import * as FacultyManagementController from '../controllers/Admin/FacultyManagementController.js';
import * as SiteSettingController from '../controllers/Admin/SiteSettingController.js';
import * as ContactMessageController from '../controllers/Admin/ContactMessageController.js';
import * as StudentDocumentController from '../controllers/Admin/StudentDocumentController.js';
import * as ResourceController from '../controllers/Academic/ResourceController.js';
import { uploadPhoto, uploadFile } from '../middleware/upload.js';

const admin = Router();
admin.use(authorize('admin', 'super_admin'));

admin.get('/stats', DashboardController.stats);

admin.get('/students', AdminUserController.index);
admin.post('/students', uploadPhoto('students').single('photo'), AdminUserController.store);
admin.get('/student/:id', AdminUserController.show);
admin.put('/student/:id', uploadPhoto('students').single('photo'), AdminUserController.update);
admin.post('/student/:id', uploadPhoto('students').single('photo'), (req, res) => {
  if (req.body._method === 'PUT') {
    return AdminUserController.update(req, res);
  }
  res.status(405).json({ message: 'Method not allowed' });
});

admin.get('/student/:id/documents', StudentDocumentController.index);
admin.post('/student/:id/documents', uploadFile('student_documents').single('file'), StudentDocumentController.store);
admin.delete('/student/:id/documents/:documentId', StudentDocumentController.destroy);

admin.post('/student/:action/:id', AdminUserController.action);

admin.get('/admissions', AdmissionManagerController.index);
admin.post('/admission/approve/:id', AdmissionManagerController.approve);
admin.post('/admission/bulk-action', AdmissionManagerController.bulkAction);
admin.post('/admission/:action/:id', AdmissionManagerController.singleAction);

admin.get('/batches', BatchController.index);
admin.post('/batches', BatchController.store);
admin.get('/batches/:id', BatchController.show);
admin.put('/batches/:id', BatchController.update);
admin.delete('/batches/:id', BatchController.destroy);

admin.get('/courses', CourseController.index);
admin.post('/courses', uploadPhoto('courses').single('thumbnail'), CourseController.store);
admin.get('/courses/:id', CourseController.show);
admin.put('/courses/:id', uploadPhoto('courses').single('thumbnail'), CourseController.update);
admin.post('/courses/:id', uploadPhoto('courses').single('thumbnail'), (req, res) => {
  if (req.body._method === 'PUT') {
    return CourseController.update(req, res);
  }
  res.status(405).json({ message: 'Method not allowed' });
});
admin.delete('/courses/:id', CourseController.destroy);
admin.post('/courses/:id/toggle-active', CourseController.toggleActive);
admin.post('/courses/:id/toggle-featured', CourseController.toggleFeatured);

admin.get('/course-categories', CourseCategoryController.index);
admin.post('/course-categories', CourseCategoryController.store);
admin.put('/course-categories/:id', CourseCategoryController.update);
admin.delete('/course-categories/:id', CourseCategoryController.destroy);
admin.post('/course-categories/reorder', CourseCategoryController.reorder);
admin.post('/course-categories/:id/toggle-active', CourseCategoryController.toggleActive);
admin.post('/course-categories/:id/toggle-visible', CourseCategoryController.toggleVisible);

admin.get('/teachers', TeacherController.index);
admin.post('/teachers', TeacherController.store);
admin.put('/teachers/:id', TeacherController.update);
admin.post('/teachers/:id/photo', uploadPhoto('teacher_photos').single('photo'), TeacherController.updatePhoto);
admin.delete('/teachers/:id', TeacherController.destroy);

admin.post('/gallery/album', uploadPhoto('gallery').single('thumbnail'), GalleryController.storeAlbum);
admin.post('/gallery/:album/upload', uploadPhoto('gallery').array('images', 20), GalleryController.uploadImages);
admin.delete('/gallery/album/:id', GalleryController.destroyAlbum);
admin.delete('/gallery/:albumId/image/:imageId', GalleryController.destroyImage);

admin.get('/e-learning', ElearningVideoController.index);
admin.post('/e-learning', uploadPhoto('elearning').single('thumbnail'), ElearningVideoController.store);
admin.put('/e-learning/:id', uploadPhoto('elearning').single('thumbnail'), ElearningVideoController.update);
admin.post('/e-learning/:id', uploadPhoto('elearning').single('thumbnail'), (req, res) => {
  if (req.body._method === 'PUT') {
    return ElearningVideoController.update(req, res);
  }
  res.status(405).json({ message: 'Method not allowed' });
});
admin.delete('/e-learning/:id', ElearningVideoController.destroy);

admin.post('/notices', NoticeController.store);
admin.delete('/notices/:id', NoticeController.destroy);

admin.get('/exams', ExamController.index);
admin.post('/exams', ExamController.store);
admin.delete('/exams/:exam', ExamController.destroy);
admin.get('/exams/:id/students', ExamController.getExamData);
admin.post('/exams/marks', ExamController.storeMarks);
admin.post('/exams/:exam/publish', ExamController.togglePublish);

admin.get('/attendance/sheet', AttendanceController.getSheet);
admin.get('/attendance/monthly', AttendanceController.monthlySheet);
admin.post('/attendance/save', AttendanceController.store);
admin.post('/attendance/cell', AttendanceController.saveCell);
admin.get('/attendance/leave-requests', AttendanceController.leaveRequests);
admin.post('/attendance/leave-requests/:attendance/approve', AttendanceController.approveLeave);
admin.post('/attendance/leave-requests/:attendance/reject', AttendanceController.rejectLeave);
admin.post('/attendance/leave-requests/:attendance/review', AttendanceController.reviewLeave);

admin.post('/materials', uploadFile('materials').single('file'), ResourceController.uploadMaterial);
admin.delete('/materials/:id', ResourceController.destroy);

admin.get('/routines', RoutineController.index);
admin.get('/routines/meta', RoutineController.meta);
admin.post('/routines', RoutineController.store);
admin.post('/routines/save-all', RoutineController.saveAll);
admin.post('/routines/rename-time-slot', RoutineController.renameTimeSlot);
admin.post('/routines/publish', RoutineController.publish);
admin.post('/routines/unpublish', RoutineController.unpublish);
admin.put('/routines/:id', RoutineController.update);
admin.delete('/routines/:id', RoutineController.destroy);

admin.get('/events', EventController.index);
admin.post('/events', EventController.store);
admin.delete('/events/:id', EventController.destroy);

admin.get('/payments', PaymentController.index);
admin.post('/payments', PaymentController.store);
admin.delete('/payments/:id', PaymentController.destroy);

admin.get('/payment-settings', PaymentSettingController.show);
admin.post('/payment-settings', PaymentSettingController.update);

admin.get('/site-settings', SiteSettingController.show);
admin.post('/site-settings', uploadPhoto('site').single('hero_bg_image'), SiteSettingController.update);

admin.get('/student/:id/exam-results', PaymentController.studentExamResults);
admin.get('/student/:id/attendance', PaymentController.studentAttendance);
admin.get('/student/:id/payment-history', PaymentController.studentPaymentHistory);

admin.get('/contact-messages', ContactMessageController.index);
admin.get('/contact-messages/trashed', ContactMessageController.trashed);
admin.get('/contact-messages/:id', ContactMessageController.show);
admin.post('/contact-messages/:id/read', ContactMessageController.markAsRead);
admin.post('/contact-messages/read-all', ContactMessageController.markAllAsRead);
admin.delete('/contact-messages/:id', ContactMessageController.destroy);
admin.post('/contact-messages/:id/restore', ContactMessageController.restore);
admin.delete('/contact-messages/:id/force', ContactMessageController.forceDelete);

admin.get('/faculty', FacultyManagementController.index);
admin.post('/faculty', uploadPhoto('faculty').fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'cover_photo', maxCount: 1 },
]), FacultyManagementController.store);
admin.get('/faculty/departments', FacultyManagementController.getDepartments);
admin.get('/faculty/subjects', FacultyManagementController.getSubjects);
admin.get('/faculty/batches', FacultyManagementController.getBatches);
admin.get('/faculty/categories', FacultyManagementController.getCategories);
admin.post('/faculty/categories', FacultyManagementController.storeCategory);
admin.put('/faculty/categories/:id', FacultyManagementController.updateCategory);
admin.delete('/faculty/categories/:id', FacultyManagementController.destroyCategory);
admin.post('/faculty/reorder', FacultyManagementController.reorder);
admin.get('/faculty/:id', FacultyManagementController.show);
admin.put('/faculty/:id', uploadPhoto('faculty').fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'cover_photo', maxCount: 1 },
]), FacultyManagementController.update);
admin.delete('/faculty/:id', FacultyManagementController.destroy);
admin.post('/faculty/:id/restore', FacultyManagementController.restore);
admin.delete('/faculty/:id/force', FacultyManagementController.forceDelete);
admin.post('/faculty/:id/toggle-featured', FacultyManagementController.toggleFeatured);
admin.post('/faculty/:id/toggle-active', FacultyManagementController.toggleActive);

router.use('/admin', admin);

// Student routes
import * as StudentDashboardController from '../controllers/Student/DashboardController.js';
import * as StudentAssignmentController from '../controllers/Student/StudentAssignmentController.js';
import * as SslCommerzController from '../controllers/Student/SslCommerzController.js';

const student = Router();
student.use(authorize('student'));

student.get('/dashboard', StudentDashboardController.summary);
student.get('/results', ExamController.myResults);
student.get('/attendance/stats', AttendanceController.studentStats);
student.post('/attendance/leave-request', AttendanceController.requestLeave);
student.post('/attendance/punch-in', AttendanceController.punchIn);
student.post('/attendance/punch-out', AttendanceController.punchOut);
student.get('/routine', RoutineController.myRoutine);
student.get('/payments', PaymentController.studentFinancialStatus);
student.post('/payment/initiate', SslCommerzController.initiate);
student.get('/payment/status', SslCommerzController.status);
student.get('/documents', StudentDocumentController.studentDocuments);
student.get('/assignments', StudentAssignmentController.index);
student.get('/assignment-results', StudentAssignmentController.results);
student.post('/assignments/:assignmentId/submit', uploadFile('assignments').single('file'), StudentAssignmentController.submit);

router.use('/student', student);

// Teacher routes
import * as TeacherDashboardController from '../controllers/Teacher/TeacherDashboardController.js';
import * as TeacherProfileController from '../controllers/Teacher/TeacherProfileController.js';
import * as TeacherAttendanceController from '../controllers/Teacher/TeacherAttendanceController.js';
import * as TeacherMarksController from '../controllers/Teacher/TeacherMarksController.js';
import * as TeacherMaterialController from '../controllers/Teacher/TeacherMaterialController.js';
import * as TeacherAssignmentController from '../controllers/Teacher/TeacherAssignmentController.js';

const teacher = Router();
teacher.use(authorize('teacher'));

teacher.get('/dashboard', TeacherDashboardController.summary);
teacher.get('/batches', TeacherDashboardController.myBatches);
teacher.get('/students', TeacherDashboardController.myStudents);

teacher.get('/profile', TeacherProfileController.show);
teacher.put('/profile', TeacherProfileController.update);
teacher.post('/profile/photo', uploadPhoto('teacher_photos').single('photo'), TeacherProfileController.updatePhoto);
teacher.post('/profile/change-password', TeacherProfileController.changePassword);

teacher.get('/attendance', TeacherAttendanceController.index);
teacher.get('/attendance/students/:batchId', TeacherAttendanceController.getStudentsForAttendance);
teacher.post('/attendance/mark', TeacherAttendanceController.markAttendance);
teacher.put('/attendance/:attendanceId', TeacherAttendanceController.updateAttendance);

teacher.get('/exams', TeacherMarksController.getExams);
teacher.get('/exams/:examId/students', TeacherMarksController.getStudentsForExam);
teacher.post('/exams/marks', TeacherMarksController.saveMarks);

teacher.get('/materials', TeacherMaterialController.index);
teacher.post('/materials', uploadFile('materials').single('file'), TeacherMaterialController.store);
teacher.put('/materials/:id', uploadFile('materials').single('file'), TeacherMaterialController.update);
teacher.delete('/materials/:id', TeacherMaterialController.destroy);

teacher.get('/assignments', TeacherAssignmentController.index);
teacher.post('/assignments', uploadFile('assignments').single('attachment'), TeacherAssignmentController.store);
teacher.get('/assignments/:id', TeacherAssignmentController.show);
teacher.put('/assignments/:id', uploadFile('assignments').single('attachment'), TeacherAssignmentController.update);
teacher.delete('/assignments/:id', TeacherAssignmentController.destroy);
teacher.post('/assignments/submissions/:submissionId/grade', TeacherAssignmentController.gradeSubmission);

router.use('/teacher', teacher);

export default router;
