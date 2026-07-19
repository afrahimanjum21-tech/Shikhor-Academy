import { lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import PublicLayout from '../layouts/PublicLayout';

// Public Pages (lazy)
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Login = lazy(() => import('../pages/Login'));
const Admission = lazy(() => import('../pages/Admission'));
const Faculty = lazy(() => import('../pages/Faculty'));
const FacultyProfile = lazy(() => import('../pages/FacultyProfile'));
const Gallery = lazy(() => import('../pages/Gallery'));
const Notices = lazy(() => import('../pages/Notices'));
const Courses = lazy(() => import('../pages/Courses'));
const CourseDetail = lazy(() => import('../pages/CourseDetail'));
const Contact = lazy(() => import('../pages/Contact'));
const Library = lazy(() => import('../pages/Library'));
const CheckResult = lazy(() => import('../pages/CheckResult'));

// Admin Pages (lazy)
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdmissionManager = lazy(() => import('../pages/admin/AdmissionManager'));
const CourseManager = lazy(() => import('../pages/admin/CourseManager'));
const StaffManager = lazy(() => import('../pages/admin/StaffManager'));
const GalleryManager = lazy(() => import('../pages/admin/GalleryManager'));
const ElearningManager = lazy(() => import('../pages/admin/ElearningManager'));
const NoticeManager = lazy(() => import('../pages/admin/NoticeManager'));
const ExamManager = lazy(() => import('../pages/admin/ExamManager'));
const AttendanceManager = lazy(() => import('../pages/admin/AttendanceManager'));
const LeaveManager = lazy(() => import('../pages/admin/LeaveManager'));
const LibraryManager = lazy(() => import('../pages/admin/LibraryManager'));
const StudentManager = lazy(() => import('../pages/admin/StudentManager'));
const StudentDetails = lazy(() => import('../pages/admin/StudentDetails'));
const StudentProfileTab = lazy(() => import('../pages/admin/StudentProfileTab'));
const StudentAcademicHistory = lazy(() => import('../pages/admin/StudentAcademicHistory'));
const StudentExamResults = lazy(() => import('../pages/admin/StudentExamResults'));
const StudentAttendance = lazy(() => import('../pages/admin/StudentAttendance'));
const StudentPaymentHistory = lazy(() => import('../pages/admin/StudentPaymentHistory'));
const StudentDocumentsTab = lazy(() => import('../pages/admin/StudentDocumentsTab'));
const RoutineManager = lazy(() => import('../pages/admin/RoutineManager'));
const BatchManager = lazy(() => import('../pages/admin/BatchManager'));
const EventManager = lazy(() => import('../pages/admin/EventManager'));
const PaymentManager = lazy(() => import('../pages/admin/PaymentManager'));
const PaymentSettings = lazy(() => import('../pages/admin/PaymentSettings'));
const SiteSettings = lazy(() => import('../pages/admin/SiteSettings'));
const PaymentResult = lazy(() => import('../pages/payment/PaymentResult'));
const ContactMessages = lazy(() => import('../pages/admin/ContactMessages'));

// Student Pages (lazy)
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const StudentResults = lazy(() => import('../pages/student/StudentResults'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));
const ClassRoutine = lazy(() => import('../pages/student/ClassRoutine'));
const AcademicCalendar = lazy(() => import('../pages/student/AcademicCalendar'));
const StudentAttendanceReport = lazy(() => import('../pages/student/StudentAttendance'));
const TuitionFees = lazy(() => import('../pages/student/TuitionFees'));
const ExtraCurricular = lazy(() => import('../pages/student/ExtraCurricular'));
const ELearning = lazy(() => import('../pages/student/ELearning'));
const StudentAssignments = lazy(() => import('../pages/student/StudentAssignments'));
const StudentAssignmentResults = lazy(() => import('../pages/student/StudentAssignmentResults'));

// Teacher Pages (lazy)
const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard'));
const TeacherProfile = lazy(() => import('../pages/teacher/TeacherProfile'));
const TeacherBatches = lazy(() => import('../pages/teacher/TeacherBatches'));
const TeacherStudents = lazy(() => import('../pages/teacher/TeacherStudents'));
const TeacherAttendance = lazy(() => import('../pages/teacher/TeacherAttendance'));
const TeacherMarks = lazy(() => import('../pages/teacher/TeacherMarks'));
const TeacherMaterials = lazy(() => import('../pages/teacher/TeacherMaterials'));
const TeacherAssignments = lazy(() => import('../pages/teacher/TeacherAssignments'));

const ProtectedRoute = ({ role }) => {
    const { user, token } = useAuth();
    if (!token) return <Navigate to="/login" />;

    if (user.role === 'super_admin') return <Outlet />;

    if (role && user.role !== role) {
        if (user.role === 'student') return <Navigate to="/student/dashboard" />;
        if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
        if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" />;
        return <Navigate to="/" />;
    }
    return <Outlet />;
};

// পাবলিক লাইব্রেরি - স্টুডেন্ট লগইন থাকলে সরাসরি স্টুডেন্ট প্যানেলে নিয়ে যায়
const PublicLibraryRoute = () => {
    const { user, token } = useAuth();
    if (token && user?.role === 'student') return <Navigate to="/student/library" replace />;
    return <Library requireAuth={true} />;
};

export default function AppRoutes() {
    return (
        <Routes>
            {/* --- Public Area --- */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/course/:slug" element={<CourseDetail />} />
                <Route path="/faculty" element={<Faculty />} />
                <Route path="/faculty/:slug" element={<FacultyProfile />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/admission" element={<Admission />} />
                <Route path="/login" element={<Login />} />
                <Route path="/library" element={<PublicLibraryRoute />} />
            </Route>

            <Route path="/check-result" element={<CheckResult />} />
            <Route path="/payment/success" element={<PaymentResult type="success" />} />
            <Route path="/payment/failed" element={<PaymentResult type="failed" />} />
            <Route path="/payment/cancelled" element={<PaymentResult type="cancelled" />} />

            {/* --- ADMIN AREA --- */}
            <Route element={<ProtectedRoute role="admin" />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/admissions" element={<AdmissionManager />} />
                    <Route path="/admin/courses" element={<CourseManager />} />
                    <Route path="/admin/staff" element={<StaffManager />} />
                    <Route path="/admin/teachers" element={<Navigate to="/admin/staff" replace />} />
                    <Route path="/admin/faculty" element={<Navigate to="/admin/staff" replace />} />
                    <Route path="/admin/gallery" element={<GalleryManager />} />
                    <Route path="/admin/e-learning" element={<ElearningManager />} />
                    <Route path="/admin/notices" element={<NoticeManager />} />
                    <Route path="/admin/exams" element={<ExamManager />} />
                    <Route path="/admin/attendance" element={<AttendanceManager />} />
                    <Route path="/admin/leave-requests" element={<LeaveManager />} />
                    <Route path="/admin/library" element={<LibraryManager />} />
                    <Route path="/admin/students" element={<StudentManager />} />
                    <Route path="/admin/students/:id" element={<StudentDetails />}>
                        <Route index element={<Navigate to="profile" replace />} />
                        <Route path="profile" element={<StudentProfileTab />} />
                        <Route path="academic-history" element={<StudentAcademicHistory />} />
                        <Route path="exam-results" element={<StudentExamResults />} />
                        <Route path="attendance" element={<StudentAttendance />} />
                        <Route path="payment-history" element={<StudentPaymentHistory />} />
                        <Route path="documents" element={<StudentDocumentsTab />} />
                    </Route>
                    <Route path="/admin/routine" element={<RoutineManager />} />
                    <Route path="/admin/batches" element={<BatchManager />} />
                    <Route path="/admin/events" element={<EventManager />} />
                    <Route path="/admin/payments" element={<PaymentManager />} /> {/* <--- নতুন রাউট */}
                    <Route path="/admin/payment-settings" element={<PaymentSettings />} />
                    <Route path="/admin/site-settings" element={<SiteSettings />} />
                    <Route path="/admin/contact-messages" element={<ContactMessages />} />
                </Route>
            </Route>

            {/* --- STUDENT AREA --- */}
            <Route element={<ProtectedRoute role="student" />}>
                <Route element={<StudentLayout />}>
                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                    <Route path="/student/profile" element={<StudentProfile />} />
                    <Route path="/student/results" element={<StudentResults />} />
                    <Route path="/student/routine" element={<ClassRoutine />} />
                    <Route path="/student/calendar" element={<AcademicCalendar />} />
                    <Route path="/student/attendance-report" element={<StudentAttendanceReport />} />
                    <Route path="/student/fees" element={<TuitionFees />} />
                    <Route path="/student/extra-curricular" element={<ExtraCurricular />} />
                    <Route path="/student/attitude" element={<ExtraCurricular />} />
                    <Route path="/student/e-learning" element={<ELearning />} />
                    <Route path="/student/assignments" element={<StudentAssignments />} />
                    <Route path="/student/assignment-results" element={<StudentAssignmentResults />} />
                    <Route path="/student/library" element={<Library />} />
                    <Route path="/student/gallery" element={<Gallery />} />
                </Route>
            </Route>

            {/* --- TEACHER AREA --- */}
            <Route element={<ProtectedRoute role="teacher" />}>
                <Route element={<TeacherLayout />}>
                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                    <Route path="/teacher/profile" element={<TeacherProfile />} />
                    <Route path="/teacher/batches" element={<TeacherBatches />} />
                    <Route path="/teacher/students" element={<TeacherStudents />} />
                    <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                    <Route path="/teacher/marks" element={<TeacherMarks />} />
                    <Route path="/teacher/materials" element={<TeacherMaterials />} />
                    <Route path="/teacher/assignments" element={<TeacherAssignments />} />
                </Route>
            </Route>
        </Routes>
    );
}
