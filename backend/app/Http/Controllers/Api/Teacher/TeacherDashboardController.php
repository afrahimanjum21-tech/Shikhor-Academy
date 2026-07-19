<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\TeacherBatchAssignment;
use App\Models\Batch;
use App\Models\Student;
use App\Models\Exam;
use App\Models\Notice;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TeacherDashboardController extends Controller
{
    public function summary(Request $request)
    {
        $teacher = $request->user();

        // Get assigned batches
        $assignedBatches = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->with('batch.course')
            ->get();

        $batchIds = $assignedBatches->pluck('batch_id');

        // Today's classes (simplified — counts assigned batches)
        $todayClasses = $assignedBatches->count();

        // Total students in assigned batches
        $totalStudents = Student::whereIn('current_batch_id', $batchIds)->count();

        // Upcoming exams for the courses that the assigned batches belong to
        $courseIds = $assignedBatches->pluck('batch.course_id')->filter()->unique();
        $today = Carbon::today();
        $upcomingExams = Exam::whereIn('course_id', $courseIds)
            ->where('date', '>=', $today)
            ->where('is_published', false)
            ->count();

        // Recent notices (Notice table has no target_audience column — fetch latest 5)
        $recentNotices = Notice::latest()->take(5)->get();

        // Latest materials uploaded by this teacher (study_materials has no uploaded_by column — skip safely)
        $latestMaterials = collect();

        return response()->json([
            'today_classes' => $todayClasses,
            'total_batches' => $assignedBatches->count(),
            'total_students' => $totalStudents,
            'upcoming_exams' => $upcomingExams,
            'pending_attendance' => 0,
            'recent_notices' => $recentNotices,
            'latest_materials' => $latestMaterials,
            'assigned_batches' => $assignedBatches,
        ]);
    }

    public function myBatches(Request $request)
    {
        $teacher = $request->user();

        $assignments = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->with(['batch.course', 'batch.students'])
            ->get();

        return response()->json($assignments);
    }

    public function myStudents(Request $request)
    {
        $teacher = $request->user();

        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $students = Student::whereIn('current_batch_id', $batchIds)
            ->with(['user', 'batch.course'])
            ->get();

        return response()->json($students);
    }
}
