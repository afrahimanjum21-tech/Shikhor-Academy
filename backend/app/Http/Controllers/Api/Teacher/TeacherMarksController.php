<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\TeacherBatchAssignment;
use App\Models\Student;
use App\Services\GradeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherMarksController extends Controller
{
    public function __construct(
        private readonly GradeService $gradeService,
    ) {}

    public function getExams(Request $request)
    {
        $teacher = $request->user();
        
        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $exams = Exam::whereHas('course', function ($query) use ($batchIds) {
            $query->whereHas('batches', function ($q) use ($batchIds) {
                $q->whereIn('id', $batchIds);
            });
        })
        ->with('course')
        ->latest()
        ->get();

        return response()->json($exams);
    }

    public function getStudentsForExam(Request $request, $examId)
    {
        $teacher = $request->user();
        
        $exam = Exam::findOrFail($examId);
        
        // Verify teacher has access to this exam's batches
        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $examBatchIds = $exam->course->batches->pluck('id');
        
        $hasAccess = $examBatchIds->intersect($batchIds)->isNotEmpty();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this exam'], 403);
        }

        $students = Student::whereIn('current_batch_id', $examBatchIds)
            ->with(['user', 'batch'])
            ->get();

        // Get existing results for this exam
        $existingResults = ExamResult::where('exam_id', $examId)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        return response()->json([
            'exam' => $exam,
            'students' => $students->map(function ($student) use ($existingResults) {
                $result = $existingResults->get($student->id);
                return [
                    'student' => $student,
                    'existing_result' => $result,
                ];
            }),
        ]);
    }

    public function saveMarks(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'marks_data' => 'required|array',
            'marks_data.*.student_id' => 'required|exists:students,id',
            'marks_data.*.details' => 'required|array',
        ]);

        $teacher = $request->user();
        $exam = Exam::findOrFail($validated['exam_id']);

        // Verify teacher has access to this exam's batches
        $batchIds = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->pluck('batch_id');

        $examBatchIds = $exam->course->batches->pluck('id');

        $hasAccess = $examBatchIds->intersect($batchIds)->isNotEmpty();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this exam'], 403);
        }

        $subjects = $exam->subjects ?: [];
        $subjectMarks = $exam->subject_marks ?: [];

        DB::transaction(function () use ($validated, $exam, $subjects, $subjectMarks) {
            foreach ($validated['marks_data'] as $data) {
                $marksDetails = [];

                foreach ($subjects as $subject) {
                    $fullMark = $subjectMarks[$subject] ?? 100;
                    $raw = $data['details'][$subject] ?? 0;
                    $marksDetails[$subject] = min(max((float) $raw, 0), $fullMark);
                }

                $gradeData = $this->gradeService->calculate(
                    $marksDetails,
                    (float) ($exam->total_marks ?? array_sum($subjectMarks))
                );

                ExamResult::updateOrCreate(
                    ['exam_id' => $exam->id, 'student_id' => $data['student_id']],
                    [
                        'marks_details' => $gradeData['marks_details'],
                        'total_obtained' => $gradeData['total_obtained'],
                        'grade' => $gradeData['grade'],
                        'gpa' => $gradeData['gpa'],
                    ]
                );
            }
        });

        return response()->json(['message' => 'Marks saved successfully']);
    }
}
