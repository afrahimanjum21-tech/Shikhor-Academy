<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\Course;
use App\Models\Faculty;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json([
            'total_students' => User::where('role', 'student')->count(),
            'total_teachers' => User::where('role', 'teacher')->count(),
            'total_faculty' => Faculty::count(),
            'total_courses' => Course::count(),
            'total_batches' => Batch::count(),
            'pending_admissions' => AdmissionApplication::where('status', 'pending')->count(),
            'hold_admissions' => AdmissionApplication::where('status', 'hold')->count(),
            'pending_payments' => Payment::where('status', 'pending')->count(),
            'pending_leave_requests' => Attendance::where('leave_status', 'pending')->count(),
        ]);
    }
}
