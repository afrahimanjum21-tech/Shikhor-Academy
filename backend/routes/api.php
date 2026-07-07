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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// --- PUBLIC ROUTES ---
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admission/submit', [AdmissionController::class, 'submit']);
Route::post('/contact', [ContactController::class, 'submit']);

Route::get('/public/courses', function() { return \App\Models\Course::where('is_active', true)->get(); });
Route::get('/public/teachers', [TeacherController::class, 'index']);
Route::get('/public/gallery', [GalleryController::class, 'index']);
Route::get('/public/notices', [NoticeController::class, 'index']);
Route::get('/public/materials', [ResourceController::class, 'publicIndex']);
Route::get('/public/events', [EventController::class, 'index']);

// --- SSLCOMMERZ CALLBACK ROUTES (PUBLIC - SSLCommerz server redirects here) ---
Route::match(['get', 'post'], '/student/payment/success', [SslCommerzController::class, 'success']);
Route::match(['get', 'post'], '/student/payment/failed', [SslCommerzController::class, 'failed']);
Route::match(['get', 'post'], '/student/payment/cancel', [SslCommerzController::class, 'cancel']);
Route::post('/student/payment/ipn', [SslCommerzController::class, 'ipn']);

// --- PROTECTED ROUTES ---
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // --- ADMIN ROUTES ---
    Route::middleware('role:admin|super_admin')->prefix('admin')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        
        // Modules
        Route::get('/students', [AdminUserController::class, 'index']);
        Route::get('/student/{id}', [AdminUserController::class, 'show']);
        Route::post('/student/{action}/{id}', [AdminUserController::class, 'action']);
        Route::put('/student/{id}', [AdminUserController::class, 'update']);
        
        Route::apiResource('batches', BatchController::class);
        
        Route::get('/admissions', function() { return \App\Models\AdmissionApplication::with('course')->latest()->get(); });
        Route::post('/admission/approve/{id}', [AdmissionManagerController::class, 'approve']);
        Route::post('/admission/bulk-action', [AdmissionManagerController::class, 'bulkAction']);
        
        Route::apiResource('courses', CourseController::class);
        
        Route::post('/teachers', [TeacherController::class, 'store']);
        Route::delete('/teachers/{id}', [TeacherController::class, 'destroy']);

        Route::post('/gallery/album', [GalleryController::class, 'storeAlbum']);
        Route::post('/gallery/{album}/upload', [GalleryController::class, 'uploadImages']);
        Route::delete('/gallery/album/{id}', [GalleryController::class, 'destroyAlbum']);

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
        Route::get('/attendance/leave-requests', [AttendanceController::class, 'leaveRequests']);
        Route::post('/attendance/leave-requests/{attendance}/review', [AttendanceController::class, 'reviewLeave']);
        
        Route::post('/materials', [ResourceController::class, 'uploadMaterial']);
        Route::delete('/materials/{id}', [ResourceController::class, 'destroy']);

        Route::get('/routines', [RoutineController::class, 'index']);
        Route::post('/routines', [RoutineController::class, 'store']);
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

        // Student Detail Pages (Admin View)
        Route::get('/student/{id}/exam-results', [PaymentController::class, 'studentExamResults']);
        Route::get('/student/{id}/attendance', [PaymentController::class, 'studentAttendance']);
        Route::get('/student/{id}/payment-history', [PaymentController::class, 'studentPaymentHistory']);
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
    });
});
