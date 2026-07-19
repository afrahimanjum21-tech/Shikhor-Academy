<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();

        if (!$student || !$student->current_batch_id) {
            return response()->json(['message' => 'Student batch not found'], 404);
        }

        $assignments = Assignment::where('batch_id', $student->current_batch_id)
            ->with(['teacher.teacher_profile', 'batch.course'])
            ->latest()
            ->get();

        $submissions = AssignmentSubmission::where('student_id', $student->id)
            ->get()
            ->keyBy('assignment_id');

        $grouped = $assignments->groupBy(function ($assignment) {
            return $assignment->teacher_id;
        })->map(function ($items, $teacherId) use ($submissions) {
            $teacher = $items->first()->teacher;

            return [
                'teacher' => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'phone' => $teacher->phone,
                    'profile_photo_path' => $teacher->profile_photo_path,
                    'profile_photo_url' => $teacher->profile_photo_url,
                    'designation' => $teacher->teacher_profile?->designation,
                    'subject' => $teacher->teacher_profile?->subject,
                ],
                'assignments' => $items->map(function ($assignment) use ($submissions) {
                    $submission = $submissions->get($assignment->id);

                    return [
                        'id' => $assignment->id,
                        'title' => $assignment->title,
                        'description' => $assignment->description,
                        'subject' => $assignment->subject,
                        'due_date' => $assignment->due_date,
                        'total_marks' => $assignment->total_marks,
                        'attachment_path' => $assignment->attachment_path,
                        'submission' => $submission ? [
                            'id' => $submission->id,
                            'submission_file_path' => $submission->submission_file_path,
                            'submission_text' => $submission->submission_text,
                            'marks_obtained' => $submission->marks_obtained,
                            'feedback' => $submission->feedback,
                            'status' => $submission->status,
                            'submitted_at' => $submission->submitted_at,
                        ] : null,
                    ];
                }),
            ];
        })->values();

        return response()->json($grouped);
    }

    public function submit(Request $request, $assignmentId)
    {
        $student = Student::where('user_id', $request->user()->id)->first();

        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $assignment = Assignment::findOrFail($assignmentId);

        $request->validate([
            'submission_file' => 'required|file|max:204800',
        ]);

        $path = $request->file('submission_file')->store('assignment_submissions', 'public');

        $submission = AssignmentSubmission::updateOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
            ],
            [
                'submission_file_path' => $path,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Assignment submitted successfully',
            'submission' => $submission,
        ]);
    }

    public function results(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();

        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $submissions = AssignmentSubmission::where('student_id', $student->id)
            ->with(['assignment.teacher.teacher_profile', 'assignment.batch.course'])
            ->latest('submitted_at')
            ->get();

        $grouped = $submissions->groupBy(function ($submission) {
            return $submission->assignment->teacher_id;
        })->map(function ($items, $teacherId) {
            $teacher = $items->first()->assignment->teacher;

            return [
                'teacher' => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'phone' => $teacher->phone,
                    'profile_photo_path' => $teacher->profile_photo_path,
                    'profile_photo_url' => $teacher->profile_photo_url,
                    'designation' => $teacher->teacher_profile?->designation,
                    'subject' => $teacher->teacher_profile?->subject,
                ],
                'results' => $items->map(function ($submission) {
                    $assignment = $submission->assignment;

                    return [
                        'id' => $submission->id,
                        'assignment_id' => $assignment->id,
                        'title' => $assignment->title,
                        'subject' => $assignment->subject,
                        'total_marks' => $assignment->total_marks,
                        'due_date' => $assignment->due_date,
                        'submission_file_path' => $submission->submission_file_path,
                        'marks_obtained' => $submission->marks_obtained,
                        'feedback' => $submission->feedback,
                        'status' => $submission->status,
                        'submitted_at' => $submission->submitted_at,
                    ];
                }),
            ];
        })->values();

        return response()->json($grouped);
    }
}
