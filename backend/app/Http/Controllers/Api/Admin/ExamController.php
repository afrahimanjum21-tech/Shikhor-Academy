<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    public function index()
    {
        return Exam::with('course')->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'course_id' => ['required', 'exists:courses,id'],
            'type' => ['required', Rule::in(['monthly', 'mcq'])],
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*' => ['required', 'string', 'max:80'],
            'subject_marks' => ['required', 'array'],
            'date' => ['required', 'date'],
        ]);

        $subjectMarks = $this->normalizedSubjectMarks($validated['subjects'], $validated['subject_marks']);

        Exam::create([
            'name' => $validated['name'],
            'course_id' => $validated['course_id'],
            'type' => $validated['type'],
            'subjects' => $validated['subjects'],
            'subject_marks' => $subjectMarks,
            'total_marks' => array_sum($subjectMarks),
            'date' => $validated['date'],
            'is_published' => false,
        ]);

        return response()->json(['message' => 'Exam Created Successfully']);
    }

    public function getExamData($examId)
    {
        $exam = Exam::with('course')->findOrFail($examId);
        $students = $this->studentsForCourse($exam->course_id)
            ->with(['user', 'exam_results' => function ($query) use ($examId) {
                $query->where('exam_id', $examId);
            }])
            ->orderBy('student_id_card_no')
            ->get();

        return response()->json([
            'exam' => $exam,
            'subjects' => $exam->subjects ?: [],
            'subject_marks' => $this->normalizedSubjectMarks($exam->subjects ?: [], $exam->subject_marks ?: []),
            'total_marks' => $exam->total_marks,
            'students' => $students,
        ]);
    }

    public function storeMarks(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => ['required', 'exists:exams,id'],
            'marks_data' => ['required', 'array'],
            'marks_data.*.student_id' => ['required', 'exists:students,id'],
            'marks_data.*.details' => ['required', 'array'],
        ]);

        $exam = Exam::findOrFail($validated['exam_id']);
        $subjects = $exam->subjects ?: [];
        $subjectMarks = $this->normalizedSubjectMarks($subjects, $exam->subject_marks ?: []);

        foreach ($validated['marks_data'] as $data) {
            $marksDetails = [];

            foreach ($subjects as $subject) {
                $fullMark = $subjectMarks[$subject] ?? 100;
                $raw = $data['details'][$subject] ?? 0;
                $marksDetails[$subject] = min(max((float) $raw, 0), $fullMark);
            }

            $totalObtained = array_sum($marksDetails);
            $percentage = $exam->total_marks > 0 ? ($totalObtained / $exam->total_marks) * 100 : 0;

            ExamResult::updateOrCreate(
                ['exam_id' => $exam->id, 'student_id' => $data['student_id']],
                [
                    'marks_details' => $marksDetails,
                    'total_obtained' => $totalObtained,
                    'gpa' => number_format($this->gpaFromPercentage($percentage), 2),
                    'grade' => $this->gradeFromPercentage($percentage),
                ]
            );
        }

        return response()->json(['message' => 'Results Saved Successfully']);
    }

    public function togglePublish(Exam $exam)
    {
        $exam->update(['is_published' => !$exam->is_published]);

        return response()->json([
            'message' => $exam->is_published ? 'Result published' : 'Result unpublished',
            'is_published' => $exam->is_published,
        ]);
    }

    public function destroy(Exam $exam)
    {
        $exam->delete();

        return response()->json(['message' => 'Exam deleted successfully']);
    }

    public function myResults()
    {
        $student = Student::where('user_id', Auth::id())->first();
        if (!$student) {
            return response()->json([]);
        }

        return ExamResult::where('student_id', $student->id)
            ->whereHas('exam', fn ($query) => $query->where('is_published', true))
            ->with('exam.course')
            ->latest()
            ->get();
    }

    private function studentsForCourse($courseId)
    {
        return Student::query()
            ->whereHas('batch', fn ($query) => $query->where('course_id', $courseId))
            ->orWhereHas('admission', fn ($query) => $query->where('course_id', $courseId));
    }

    private function normalizedSubjectMarks(array $subjects, array $subjectMarks): array
    {
        $normalized = [];

        foreach ($subjects as $subject) {
            $normalized[$subject] = max(1, (int) ($subjectMarks[$subject] ?? 100));
        }

        return $normalized;
    }

    private function gradeFromPercentage(float $percentage): string
    {
        if ($percentage >= 80) return 'A+';
        if ($percentage >= 70) return 'A';
        if ($percentage >= 60) return 'A-';
        if ($percentage >= 50) return 'B';
        if ($percentage >= 40) return 'C';
        if ($percentage >= 33) return 'D';

        return 'F';
    }

    private function gpaFromPercentage(float $percentage): float
    {
        if ($percentage >= 80) return 5.00;
        if ($percentage >= 70) return 4.00;
        if ($percentage >= 60) return 3.50;
        if ($percentage >= 50) return 3.00;
        if ($percentage >= 40) return 2.00;
        if ($percentage >= 33) return 1.00;

        return 0.00;
    }
}
