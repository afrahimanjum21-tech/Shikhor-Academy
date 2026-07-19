<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Public\AdmissionController;
use App\Http\Controllers\Api\Public\ContactController;
use App\Http\Controllers\Api\Admin\AdmissionManagerController;
use App\Http\Controllers\Api\Admin\CourseController;
use App\Http\Controllers\Api\Admin\TeacherController;
use App\Http\Controllers\Api\Admin\GalleryController;
use App\Http\Controllers\Api\Admin\ElearningVideoController;
use App\Http\Controllers\Api\Admin\NoticeController;
use App\Http\Controllers\Api\Admin\ExamController;
use App\Http\Controllers\Api\Admin\AttendanceController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Academic\ResourceController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\RoutineController;
use App\Http\Controllers\Api\Admin\BatchController;
use App\Http\Controllers\Api\Admin\EventController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\PaymentSettingController;
use App\Http\Controllers\Api\Student\SslCommerzController;
use App\Http\Controllers\Api\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\Teacher\TeacherDashboardController;
use App\Http\Controllers\Api\Teacher\TeacherProfileController;
use App\Http\Controllers\Api\Teacher\TeacherAttendanceController;
use App\Http\Controllers\Api\Teacher\TeacherMarksController;
use App\Http\Controllers\Api\Teacher\TeacherMaterialController;
use App\Http\Controllers\Api\Teacher\TeacherAssignmentController;
use App\Http\Controllers\Api\Admin\FacultyManagementController;
use App\Http\Controllers\Api\Public\FacultyController as PublicFacultyController;
use App\Http\Controllers\Api\Public\CourseController as PublicCourseController;
use App\Http\Controllers\Api\Admin\CourseCategoryController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Admin\ContactMessageController;
use App\Http\Controllers\Api\Admin\StudentDocumentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// --- PUBLIC ROUTES ---
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admission/submit', [AdmissionController::class, 'submit'])->middleware('throttle:admission');
Route::post('/contact', [ContactController::class, 'submit'])->middleware('throttle:contact');

Route::get('/public/courses', [PublicCourseController::class, 'index']);
Route::get('/public/course-categories', [PublicCourseController::class, 'categories']);
Route::get('/public/course-stats', [PublicCourseController::class, 'stats']);
Route::get('/public/courses/slug/{slug}', [PublicCourseController::class, 'bySlug']);
Route::get('/public/courses/featured', [PublicCourseController::class, 'featured']);
Route::get('/public/teachers', [TeacherController::class, 'index']);
Route::get('/public/gallery', [GalleryController::class, 'index']);
Route::get('/public/e-learning', [ElearningVideoController::class, 'publicIndex']);
Route::get('/public/notices', [NoticeController::class, 'index']);
Route::get('/public/materials', [ResourceController::class, 'publicIndex']);
Route::get('/public/events', [EventController::class, 'index']);
Route::get('/public/site-settings', [\App\Http\Controllers\Api\Public\SiteSettingController::class, 'show']);

// --- PUBLIC FACULTY ROUTES ---
Route::get('/public/faculty', [PublicFacultyController::class, 'index']);
Route::get('/public/faculty/featured', [PublicFacultyController::class, 'featured']);
Route::get('/public/faculty/categories', [PublicFacultyController::class, 'categories']);
Route::get('/public/faculty/departments', [PublicFacultyController::class, 'departments']);
Route::get('/public/faculty/subjects', [PublicFacultyController::class, 'subjects']);
Route::get('/public/faculty/search', [PublicFacultyController::class, 'search']);
Route::get('/public/faculty/{slug}', [PublicFacultyController::class, 'show']);

// --- SSLCOMMERZ CALLBACK ROUTES (PUBLIC - SSLCommerz server redirects here) ---
Route::match(['get', 'post'], '/student/payment/success', [SslCommerzController::class, 'success']);
Route::match(['get', 'post'], '/student/payment/failed', [SslCommerzController::class, 'failed']);
Route::match(['get', 'post'], '/student/payment/cancel', [SslCommerzController::class, 'cancel']);
Route::post('/student/payment/ipn', [SslCommerzController::class, 'ipn']);

// --- PROTECTED ROUTES ---
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Notification counts (role-aware, any authenticated user)
    Route::get('/notifications/counts', [\App\Http\Controllers\Api\NotificationCountsController::class, 'counts']);

    // Notifications API (any authenticated user)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/read-by-type', [NotificationController::class, 'markReadByType']);
    Route::get('/recent-activity', [NotificationController::class, 'recentActivity']);

    // --- ADMIN ROUTES ---
    Route::middleware('role:admin|super_admin')->prefix('admin')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        
        // Modules
        Route::get('/students', [AdminUserController::class, 'index']);
        Route::post('/students', [AdminUserController::class, 'store']);
        Route::get('/student/{id}', [AdminUserController::class, 'show']);
        Route::put('/student/{id}', [AdminUserController::class, 'update']);

        // Student Documents (must come before the generic action route to avoid conflict)
        Route::get('/student/{id}/documents', [StudentDocumentController::class, 'index']);
        Route::post('/student/{id}/documents', [StudentDocumentController::class, 'store']);
        Route::delete('/student/{id}/documents/{documentId}', [StudentDocumentController::class, 'destroy']);

        Route::post('/student/{action}/{id}', [AdminUserController::class, 'action']);
        
        Route::apiResource('batches', BatchController::class);
        
        Route::get('/admissions', function() { return \App\Models\AdmissionApplication::with('course')->latest()->get(); });
        Route::post('/admission/approve/{id}', [AdmissionManagerController::class, 'approve']);
        Route::post('/admission/bulk-action', [AdmissionManagerController::class, 'bulkAction']);
        
        Route::apiResource('courses', CourseController::class);
        Route::post('/courses/{id}/toggle-active', [CourseController::class, 'toggleActive']);
        Route::post('/courses/{id}/toggle-featured', [CourseController::class, 'toggleFeatured']);

        // Course Categories
        Route::get('/course-categories', [CourseCategoryController::class, 'index']);
        Route::post('/course-categories', [CourseCategoryController::class, 'store']);
        Route::put('/course-categories/{id}', [CourseCategoryController::class, 'update']);
        Route::delete('/course-categories/{id}', [CourseCategoryController::class, 'destroy']);
        Route::post('/course-categories/reorder', [CourseCategoryController::class, 'reorder']);
        Route::post('/course-categories/{id}/toggle-active', [CourseCategoryController::class, 'toggleActive']);
        Route::post('/course-categories/{id}/toggle-visible', [CourseCategoryController::class, 'toggleVisible']);
        
        Route::get('/teachers', [TeacherController::class, 'index']);
        Route::post('/teachers', [TeacherController::class, 'store']);
        Route::put('/teachers/{id}', [TeacherController::class, 'update']);
        Route::post('/teachers/{id}/photo', [TeacherController::class, 'updatePhoto']);
        Route::delete('/teachers/{id}', [TeacherController::class, 'destroy']);

        Route::post('/gallery/album', [GalleryController::class, 'storeAlbum']);
        Route::post('/gallery/{album}/upload', [GalleryController::class, 'uploadImages']);
        Route::delete('/gallery/album/{id}', [GalleryController::class, 'destroyAlbum']);
        Route::delete('/gallery/{albumId}/image/{imageId}', [GalleryController::class, 'destroyImage']);

        // E-Learning Videos (YouTube/Facebook link based)
        Route::get('/e-learning', [ElearningVideoController::class, 'index']);
        Route::post('/e-learning', [ElearningVideoController::class, 'store']);
        Route::put('/e-learning/{id}', [ElearningVideoController::class, 'update']);
        Route::delete('/e-learning/{id}', [ElearningVideoController::class, 'destroy']);

        Route::post('/notices', [NoticeController::class, 'store']);
        Route::delete('/notices/{id}', [NoticeController::class, 'destroy']);

        Route::get('/exams', [ExamController::class, 'index']);
        Route::post('/exams', [ExamController::class, 'store']);
        Route::delete('/exams/{exam}', [ExamController::class, 'destroy']);
        Route::get('/exams/{id}/students', [ExamController::class, 'getExamData']);
        Route::post('/exams/marks', [ExamController::class, 'storeMarks']);
        Route::post('/exams/{exam}/publish', [ExamController::class, 'togglePublish']);

        Route::get('/attendance/sheet', [AttendanceController::class, 'getSheet']);
        Route::get('/attendance/monthly', [AttendanceController::class, 'monthlySheet']);
        Route::post('/attendance/save', [AttendanceController::class, 'store']);
        Route::post('/attendance/cell', [AttendanceController::class, 'saveCell']);
        Route::get('/attendance/leave-requests', [AttendanceController::class, 'leaveRequests']);
        Route::post('/attendance/leave-requests/{attendance}/approve', [AttendanceController::class, 'approveLeave']);
        Route::post('/attendance/leave-requests/{attendance}/reject', [AttendanceController::class, 'rejectLeave']);
        Route::post('/attendance/leave-requests/{attendance}/review', [AttendanceController::class, 'reviewLeave']);
        
        Route::post('/materials', [ResourceController::class, 'uploadMaterial']);
        Route::delete('/materials/{id}', [ResourceController::class, 'destroy']);

        Route::get('/routines', [RoutineController::class, 'index']);
        Route::get('/routines/meta', [RoutineController::class, 'meta']);
        Route::post('/routines', [RoutineController::class, 'store']);
        Route::post('/routines/save-all', [RoutineController::class, 'saveAll']);
        Route::post('/routines/rename-time-slot', [RoutineController::class, 'renameTimeSlot']);
        Route::post('/routines/publish', [RoutineController::class, 'publish']);
        Route::post('/routines/unpublish', [RoutineController::class, 'unpublish']);
        Route::put('/routines/{id}', [RoutineController::class, 'update']);
        Route::delete('/routines/{id}', [RoutineController::class, 'destroy']);
        
        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::delete('/events/{id}', [EventController::class, 'destroy']);

        // Payments (Admin Side)
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::delete('/payments/{id}', [PaymentController::class, 'destroy']);

        // Payment Settings (SSLCommerz Configuration)
        Route::get('/payment-settings', [PaymentSettingController::class, 'show']);
        Route::post('/payment-settings', [PaymentSettingController::class, 'update']);

        // Site Settings (Contact info, SMTP, Social, About content)
        Route::get('/site-settings', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'show']);
        Route::post('/site-settings', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'update']);

        // Student Detail Pages (Admin View)
        Route::get('/student/{id}/exam-results', [PaymentController::class, 'studentExamResults']);
        Route::get('/student/{id}/attendance', [PaymentController::class, 'studentAttendance']);
        Route::get('/student/{id}/payment-history', [PaymentController::class, 'studentPaymentHistory']);

        // Contact Messages
        Route::get('/contact-messages', [ContactMessageController::class, 'index']);
        Route::get('/contact-messages/trashed', [ContactMessageController::class, 'trashed']);
        Route::get('/contact-messages/{id}', [ContactMessageController::class, 'show']);
        Route::post('/contact-messages/{id}/read', [ContactMessageController::class, 'markAsRead']);
        Route::post('/contact-messages/read-all', [ContactMessageController::class, 'markAllAsRead']);
        Route::delete('/contact-messages/{id}', [ContactMessageController::class, 'destroy']);
        Route::post('/contact-messages/{id}/restore', [ContactMessageController::class, 'restore']);
        Route::delete('/contact-messages/{id}/force', [ContactMessageController::class, 'forceDelete']);

        // Faculty Management
        Route::get('/faculty', [FacultyManagementController::class, 'index']);
        Route::post('/faculty', [FacultyManagementController::class, 'store']);
        Route::get('/faculty/departments', [FacultyManagementController::class, 'getDepartments']);
        Route::get('/faculty/subjects', [FacultyManagementController::class, 'getSubjects']);
        Route::get('/faculty/batches', [FacultyManagementController::class, 'getBatches']);
        Route::get('/faculty/categories', [FacultyManagementController::class, 'getCategories']);
        Route::post('/faculty/categories', [FacultyManagementController::class, 'storeCategory']);
        Route::put('/faculty/categories/{id}', [FacultyManagementController::class, 'updateCategory']);
        Route::delete('/faculty/categories/{id}', [FacultyManagementController::class, 'destroyCategory']);
        Route::post('/faculty/reorder', [FacultyManagementController::class, 'reorder']);
        Route::get('/faculty/{id}', [FacultyManagementController::class, 'show']);
        Route::match(['put', 'post'], '/faculty/{id}', [FacultyManagementController::class, 'update']);
        Route::delete('/faculty/{id}', [FacultyManagementController::class, 'destroy']);
        Route::post('/faculty/{id}/restore', [FacultyManagementController::class, 'restore']);
        Route::delete('/faculty/{id}/force', [FacultyManagementController::class, 'forceDelete']);
        Route::post('/faculty/{id}/toggle-featured', [FacultyManagementController::class, 'toggleFeatured']);
        Route::post('/faculty/{id}/toggle-active', [FacultyManagementController::class, 'toggleActive']);
    });

    // --- STUDENT ROUTES ---
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/dashboard', [StudentDashboardController::class, 'summary']);
        Route::get('/results', [ExamController::class, 'myResults']);
        Route::get('/attendance/stats', [AttendanceController::class, 'studentStats']);
        Route::post('/attendance/leave-request', [AttendanceController::class, 'requestLeave']);
        Route::post('/attendance/punch-in', [AttendanceController::class, 'punchIn']);
        Route::post('/attendance/punch-out', [AttendanceController::class, 'punchOut']);
        Route::get('/routine', [RoutineController::class, 'myRoutine']);
        
        // 🔥 Student Payments (অটোমেটিক ডিউ ক্যালকুলেশন)
        Route::get('/payments', [PaymentController::class, 'studentFinancialStatus']);

        // SSLCommerz Online Payment (authenticated)
        Route::post('/payment/initiate', [SslCommerzController::class, 'initiate']);
        Route::get('/payment/status', [SslCommerzController::class, 'status']);
        
        // Documents (student read-only)
        Route::get('/documents', [StudentDocumentController::class, 'studentDocuments']);

        // Assignments
        Route::get('/assignments', [\App\Http\Controllers\Api\Student\StudentAssignmentController::class, 'index']);
        Route::get('/assignment-results', [\App\Http\Controllers\Api\Student\StudentAssignmentController::class, 'results']);
        Route::post('/assignments/{assignmentId}/submit', [\App\Http\Controllers\Api\Student\StudentAssignmentController::class, 'submit']);
    });

    // --- TEACHER ROUTES ---
    Route::middleware('role:teacher')->prefix('teacher')->group(function () {
        // Dashboard
        Route::get('/dashboard', [TeacherDashboardController::class, 'summary']);
        Route::get('/batches', [TeacherDashboardController::class, 'myBatches']);
        Route::get('/students', [TeacherDashboardController::class, 'myStudents']);
        
        // Profile
        Route::get('/profile', [TeacherProfileController::class, 'show']);
        Route::put('/profile', [TeacherProfileController::class, 'update']);
        Route::post('/profile/photo', [TeacherProfileController::class, 'updatePhoto']);
        Route::post('/profile/change-password', [TeacherProfileController::class, 'changePassword']);
        
        // Attendance
        Route::get('/attendance', [TeacherAttendanceController::class, 'index']);
        Route::get('/attendance/students/{batchId}', [TeacherAttendanceController::class, 'getStudentsForAttendance']);
        Route::post('/attendance/mark', [TeacherAttendanceController::class, 'markAttendance']);
        Route::put('/attendance/{attendanceId}', [TeacherAttendanceController::class, 'updateAttendance']);
        
        // Marks Entry
        Route::get('/exams', [TeacherMarksController::class, 'getExams']);
        Route::get('/exams/{examId}/students', [TeacherMarksController::class, 'getStudentsForExam']);
        Route::post('/exams/marks', [TeacherMarksController::class, 'saveMarks']);
        
        // Study Materials
        Route::get('/materials', [TeacherMaterialController::class, 'index']);
        Route::post('/materials', [TeacherMaterialController::class, 'store']);
        Route::put('/materials/{id}', [TeacherMaterialController::class, 'update']);
        Route::delete('/materials/{id}', [TeacherMaterialController::class, 'destroy']);
        
        // Assignments
        Route::get('/assignments', [TeacherAssignmentController::class, 'index']);
        Route::post('/assignments', [TeacherAssignmentController::class, 'store']);
        Route::get('/assignments/{id}', [TeacherAssignmentController::class, 'show']);
        Route::put('/assignments/{id}', [TeacherAssignmentController::class, 'update']);
        Route::delete('/assignments/{id}', [TeacherAssignmentController::class, 'destroy']);
        Route::post('/assignments/submissions/{submissionId}/grade', [TeacherAssignmentController::class, 'gradeSubmission']);
    });
});
