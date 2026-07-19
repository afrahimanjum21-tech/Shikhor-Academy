<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\TeacherBatchAssignment;
use App\Models\Student;

class TeacherAttendanceController extends Controller
{
    public function index(Request $request)
    {
        $teacher = $request->user();

        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $courseIds = Batch::whereIn('id', $batchIds)->pluck('course_id');

        $attendances = Attendance::whereIn('course_id', $courseIds)
            ->with('student.user')
            ->latest()
            ->paginate(20);

        return response()->json($attendances);
    }

    public function getStudentsForAttendance(Request $request, $batchId)
    {
        $teacher = $request->user();

        $hasAccess = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->where('batch_id', $batchId)
            ->exists();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this batch'], 403);
        }

        $students = Student::where('current_batch_id', $batchId)
            ->with('user')
            ->get();

        return response()->json($students);
    }

    public function markAttendance(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,id',
            'date' => 'required|date',
            'session' => 'required|in:morning,evening',
            'attendance_data' => 'required|array',
            'attendance_data.*.student_id' => 'required|exists:students,id',
            'attendance_data.*.status' => 'required|in:present,absent,late,leave',
        ]);

        $teacher = $request->user();

        $hasAccess = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->where('batch_id', $validated['batch_id'])
            ->exists();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this batch'], 403);
        }

        $courseId = Batch::findOrFail($validated['batch_id'])->course_id;

        foreach ($validated['attendance_data'] as $data) {
            Attendance::updateOrCreate(
                [
                    'student_id' => $data['student_id'],
                    'course_id' => $courseId,
                    'date' => $validated['date'],
                    'session' => $validated['session'],
                ],
                ['status' => $data['status']]
            );
        }

        return response()->json(['message' => 'Attendance marked successfully']);
    }

    public function updateAttendance(Request $request, $attendanceId)
    {
        $validated = $request->validate([
            'attendance_data' => 'required|array',
            'attendance_data.*.student_id' => 'required|exists:students,id',
            'attendance_data.*.status' => 'required|in:present,absent,late,leave',
        ]);

        $teacher = $request->user();

        $attendance = Attendance::findOrFail($attendanceId);

        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $courseIds = Batch::whereIn('id', $batchIds)->pluck('course_id');

        if (!$courseIds->contains($attendance->course_id)) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        foreach ($validated['attendance_data'] as $data) {
            Attendance::updateOrCreate(
                [
                    'student_id' => $data['student_id'],
                    'course_id' => $attendance->course_id,
                    'date' => $attendance->date,
                    'session' => $attendance->session,
                ],
                ['status' => $data['status']]
            );
        }

        return response()->json(['message' => 'Attendance updated successfully']);
    }
}
