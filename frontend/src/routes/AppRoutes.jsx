import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
import PublicLayout from '../layouts/PublicLayout';

// Public Pages
import Home from '../pages/Home';
import About from '../pages/About';
import Login from '../pages/Login';
import Admission from '../pages/Admission';
import Faculty from '../pages/Faculty';
import Gallery from '../pages/Gallery';
import Notices from '../pages/Notices';
import Courses from '../pages/Courses';
import Contact from '../pages/Contact';
import Library from '../pages/Library';
import CheckResult from '../pages/CheckResult';

// Admin Pages
import AdminDashboard from '../pages/AdminDashboard';
import AdmissionManager from '../pages/admin/AdmissionManager';
import CourseManager from '../pages/admin/CourseManager';
import TeacherManager from '../pages/admin/TeacherManager';
import GalleryManager from '../pages/admin/GalleryManager';
import NoticeManager from '../pages/admin/NoticeManager';
import ExamManager from '../pages/admin/ExamManager';
import AttendanceManager from '../pages/admin/AttendanceManager';
import LibraryManager from '../pages/admin/LibraryManager';
import StudentManager from '../pages/admin/StudentManager';
import StudentDetails from '../pages/admin/StudentDetails';
import StudentProfileTab from '../pages/admin/StudentProfileTab';
import StudentAcademicHistory from '../pages/admin/StudentAcademicHistory';
import StudentExamResults from '../pages/admin/StudentExamResults';
import StudentAttendance from '../pages/admin/StudentAttendance';
import StudentPaymentHistory from '../pages/admin/StudentPaymentHistory';
import RoutineManager from '../pages/admin/RoutineManager';
import BatchManager from '../pages/admin/BatchManager';
import EventManager from '../pages/admin/EventManager';
import PaymentManager from '../pages/admin/PaymentManager'; // <--- নতুন ইমপোর্ট
import PaymentSettings from '../pages/admin/PaymentSettings';
import PaymentResult from '../pages/payment/PaymentResult';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentResults from '../pages/student/StudentResults';
import StudentProfile from '../pages/student/StudentProfile';
import ClassRoutine from '../pages/student/ClassRoutine';
import AcademicCalendar from '../pages/student/AcademicCalendar';
import StudentAttendanceReport from '../pages/student/StudentAttendance';
import TuitionFees from '../pages/student/TuitionFees';
import ExtraCurricular from '../pages/student/ExtraCurricular';
import ELearning from '../pages/student/ELearning';

const ProtectedRoute = ({ role }) => {
    const { user, token } = useAuth();
    if (!token) return <Navigate to="/login" />;

    if (user.role === 'super_admin') return <Outlet />;

    if (role && user.role !== role) {
        if (user.role === 'student') return <Navigate to="/student/dashboard" />;
        if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
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
                <Route path="/faculty" element={<Faculty />} />
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
                    <Route path="/admin/teachers" element={<TeacherManager />} />
                    <Route path="/admin/gallery" element={<GalleryManager />} />
                    <Route path="/admin/notices" element={<NoticeManager />} />
                    <Route path="/admin/exams" element={<ExamManager />} />
                    <Route path="/admin/attendance" element={<AttendanceManager />} />
                    <Route path="/admin/library" element={<LibraryManager />} />
                    <Route path="/admin/students" element={<StudentManager />} />
                    <Route path="/admin/students/:id" element={<StudentDetails />}>
                        <Route index element={<Navigate to="profile" replace />} />
                        <Route path="profile" element={<StudentProfileTab />} />
                        <Route path="academic-history" element={<StudentAcademicHistory />} />
                        <Route path="exam-results" element={<StudentExamResults />} />
                        <Route path="attendance" element={<StudentAttendance />} />
                        <Route path="payment-history" element={<StudentPaymentHistory />} />
                    </Route>
                    <Route path="/admin/routine" element={<RoutineManager />} />
                    <Route path="/admin/batches" element={<BatchManager />} />
                    <Route path="/admin/events" element={<EventManager />} />
                    <Route path="/admin/payments" element={<PaymentManager />} /> {/* <--- নতুন রাউট */}
                    <Route path="/admin/payment-settings" element={<PaymentSettings />} />
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
                    <Route path="/student/library" element={<Library />} />
                    <Route path="/student/gallery" element={<Gallery />} />
                </Route>
            </Route>
        </Routes>
    );
}
