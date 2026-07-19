<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\TeacherBatchAssignment;

class TeacherAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $teacher = $request->user();
        
        $assignments = Assignment::where('teacher_id', $teacher->id)
            ->with(['batch.course', 'teacher.teacher_profile', 'submissions.student.user'])
            ->latest()
            ->paginate(20);

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'batch_id' => 'required|exists:batches,id',
            'subject' => 'required|string|max:255',
            'due_date' => 'required|date',
            'attachment' => 'nullable|file|mimes:pdf,doc,docx,ppt,pptx,zip|max:204800',
            'total_marks' => 'required|numeric|min:0|max:1000',
        ]);

        $teacher = $request->user();
        
        // Verify teacher has access to this batch
        $hasAccess = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->where('batch_id', $validated['batch_id'])
            ->exists();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this batch'], 403);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('assignments', 'public');
        }

        $assignment = Assignment::create([
            'teacher_id' => $teacher->id,
            'batch_id' => $validated['batch_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'subject' => $validated['subject'],
            'due_date' => $validated['due_date'],
            'attachment_path' => $attachmentPath,
            'total_marks' => $validated['total_marks'],
        ]);

        return response()->json([
            'message' => 'Assignment created successfully',
            'assignment' => $assignment->load(['batch.course', 'teacher.teacher_profile'])
        ]);
    }

    public function show(Request $request, $id)
    {
        $teacher = $request->user();
        
        $assignment = Assignment::with(['batch.course', 'submissions.student.user'])
            ->findOrFail($id);

        // Verify teacher owns this assignment
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        return response()->json($assignment);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'sometimes|date',
            'attachment' => 'nullable|file|mimes:pdf,doc,docx,ppt,pptx,zip|max:204800',
            'total_marks' => 'sometimes|numeric|min:0|max:1000',
        ]);

        $teacher = $request->user();
        
        $assignment = Assignment::findOrFail($id);

        // Verify teacher owns this assignment
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        if (isset($validated['title'])) {
            $assignment->title = $validated['title'];
        }
        if (isset($validated['description'])) {
            $assignment->description = $validated['description'];
        }
        if (isset($validated['due_date'])) {
            $assignment->due_date = $validated['due_date'];
        }
        if (isset($validated['total_marks'])) {
            $assignment->total_marks = $validated['total_marks'];
        }
        if ($request->hasFile('attachment')) {
            // Delete old file
            if ($assignment->attachment_path) {
                $oldPath = storage_path('app/public/' . $assignment->attachment_path);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            $attachmentPath = $request->file('attachment')->store('assignments', 'public');
            $assignment->attachment_path = $attachmentPath;
        }

        $assignment->save();

        return response()->json([
            'message' => 'Assignment updated successfully',
            'assignment' => $assignment->load(['batch.course', 'teacher.teacher_profile'])
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $teacher = $request->user();
        
        $assignment = Assignment::findOrFail($id);

        // Verify teacher owns this assignment
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        // Delete attachment file
        if ($assignment->attachment_path) {
            $path = storage_path('app/public/' . $assignment->attachment_path);
            if (file_exists($path)) {
                unlink($path);
            }
        }

        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted successfully']);
    }

    public function gradeSubmission(Request $request, $submissionId)
    {
        $validated = $request->validate([
            'marks_obtained' => 'required|numeric|min:0',
            'feedback' => 'nullable|string',
        ]);

        $teacher = $request->user();
        
        $submission = AssignmentSubmission::with('assignment')->findOrFail($submissionId);

        // Verify teacher owns this assignment
        if ($submission->assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        // Validate marks don't exceed total marks
        if ($validated['marks_obtained'] > $submission->assignment->total_marks) {
            return response()->json(['message' => 'Marks cannot exceed total marks'], 422);
        }

        $submission->marks_obtained = $validated['marks_obtained'];
        $submission->feedback = $validated['feedback'] ?? null;
        $submission->status = 'reviewed';
        $submission->save();

        return response()->json([
            'message' => 'Submission graded successfully',
            'submission' => $submission->load('student.user')
        ]);
    }
}
