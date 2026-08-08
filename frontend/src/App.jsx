import { Suspense, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  useEffect(() => {
    const preloadRoutes = () => {
      Promise.allSettled([
        import('./pages/Home'),
        import('./pages/About'),
        import('./pages/Login'),
        import('./pages/Admission'),
        import('./pages/Faculty'),
        import('./pages/FacultyProfile'),
        import('./pages/Gallery'),
        import('./pages/Notices'),
        import('./pages/Courses'),
        import('./pages/CourseDetail'),
        import('./pages/Contact'),
        import('./pages/Library'),
        import('./pages/CheckResult'),
        import('./pages/AdminDashboard'),
        import('./pages/admin/AdmissionManager'),
        import('./pages/admin/CourseManager'),
        import('./pages/admin/StaffManager'),
        import('./pages/admin/GalleryManager'),
        import('./pages/admin/ElearningManager'),
        import('./pages/admin/NoticeManager'),
        import('./pages/admin/ExamManager'),
        import('./pages/admin/AttendanceManager'),
        import('./pages/admin/LeaveManager'),
        import('./pages/admin/LibraryManager'),
        import('./pages/admin/StudentManager'),
        import('./pages/admin/StudentDetails'),
        import('./pages/admin/StudentProfileTab'),
        import('./pages/admin/StudentAcademicHistory'),
        import('./pages/admin/StudentExamResults'),
        import('./pages/admin/StudentAttendance'),
        import('./pages/admin/StudentPaymentHistory'),
        import('./pages/admin/StudentDocumentsTab'),
        import('./pages/admin/RoutineManager'),
        import('./pages/admin/BatchManager'),
        import('./pages/admin/EventManager'),
        import('./pages/admin/PaymentManager'),
        import('./pages/admin/PaymentSettings'),
        import('./pages/admin/SiteSettings'),
        import('./pages/admin/ContactMessages'),
        import('./pages/payment/PaymentResult'),
        import('./pages/student/StudentDashboard'),
        import('./pages/student/StudentResults'),
        import('./pages/student/StudentProfile'),
        import('./pages/student/ClassRoutine'),
        import('./pages/student/AcademicCalendar'),
        import('./pages/student/StudentAttendance'),
        import('./pages/student/TuitionFees'),
        import('./pages/student/ExtraCurricular'),
        import('./pages/student/ELearning'),
        import('./pages/student/StudentAssignments'),
        import('./pages/student/StudentAssignmentResults'),
        import('./pages/teacher/TeacherDashboard'),
        import('./pages/teacher/TeacherProfile'),
        import('./pages/teacher/TeacherBatches'),
        import('./pages/teacher/TeacherStudents'),
        import('./pages/teacher/TeacherAttendance'),
        import('./pages/teacher/TeacherMarks'),
        import('./pages/teacher/TeacherMaterials'),
        import('./pages/teacher/TeacherAssignments'),
      ]);
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preloadRoutes, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(preloadRoutes, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Suspense fallback={<LoadingScreen />}>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

export default App;
