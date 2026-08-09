import { Router } from 'express';
import * as AdmissionController from '../controllers/Public/AdmissionController.js';
import * as AdmissionEmailActionController from '../controllers/Public/AdmissionEmailActionController.js';
import * as ContactController from '../controllers/Public/ContactController.js';
import * as CourseController from '../controllers/Public/CourseController.js';
import * as FacultyController from '../controllers/Public/FacultyController.js';
import * as SiteSettingController from '../controllers/Public/SiteSettingController.js';
import * as AuthController from '../controllers/Auth/AuthController.js';
import * as ElearningVideoController from '../controllers/Admin/ElearningVideoController.js';
import * as NoticeController from '../controllers/Admin/NoticeController.js';
import * as EventController from '../controllers/Admin/EventController.js';
import * as GalleryController from '../controllers/Admin/GalleryController.js';
import * as ResourceController from '../controllers/Academic/ResourceController.js';
import * as TeacherController from '../controllers/Admin/TeacherController.js';
import * as SslCommerzController from '../controllers/Student/SslCommerzController.js';
import { uploadPhoto } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const admissionLimiter = rateLimit({ windowMs: 60 * 1000, max: 2, message: { message: 'Too many requests, please try again later' } });
const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { message: 'Too many requests, please try again later' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many login attempts, please try again later' } });

router.post('/login', loginLimiter, AuthController.login);
router.post('/admission/submit', admissionLimiter, uploadPhoto('admission_photos', 2).single('photo'), AdmissionController.submit);
router.get('/public/admissions/action', AdmissionEmailActionController.action);
router.post('/contact', contactLimiter, ContactController.submit);

router.get('/public/courses', CourseController.index);
router.get('/public/course-categories', CourseController.categories);
router.get('/public/course-stats', CourseController.stats);
router.get('/public/courses/slug/:slug', CourseController.bySlug);
router.get('/public/courses/featured', CourseController.featured);
router.get('/public/teachers', TeacherController.index);
router.get('/public/gallery', GalleryController.index);
router.get('/public/e-learning', ElearningVideoController.publicIndex);
router.get('/public/notices', NoticeController.index);
router.get('/public/materials', ResourceController.publicIndex);
router.get('/public/events', EventController.index);
router.get('/public/site-settings', SiteSettingController.show);

router.get('/public/faculty', FacultyController.index);
router.get('/public/faculty/featured', FacultyController.featured);
router.get('/public/faculty/categories', FacultyController.categories);
router.get('/public/faculty/departments', FacultyController.departments);
router.get('/public/faculty/subjects', FacultyController.subjects);
router.get('/public/faculty/search', FacultyController.search);
router.get('/public/faculty/:slug', FacultyController.show);

router.get('/student/payment/success', SslCommerzController.success);
router.post('/student/payment/success', SslCommerzController.success);
router.get('/student/payment/failed', SslCommerzController.failed);
router.post('/student/payment/failed', SslCommerzController.failed);
router.get('/student/payment/cancel', SslCommerzController.cancel);
router.post('/student/payment/cancel', SslCommerzController.cancel);
router.post('/student/payment/ipn', SslCommerzController.ipn);

export default router;
