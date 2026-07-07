<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AcademicEvent;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Payment;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)
            ->with(['batch.course', 'admission.course'])
            ->first();

        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'card_no' => $student->student_id_card_no,
                'admission_date' => $student->admission_date,
                'course' => $student->batch?->course?->title ?? $student->admission?->course?->title,
                'batch' => $student->batch?->name,
            ],
            'attendance' => $this->attendance($student),
            'payments' => $this->payments($student),
            'upcoming' => $this->upcoming($student),
            'recent_results' => $this->recentResults($student),
        ]);
    }

    private function attendance(Student $student): array
    {
        $total = Attendance::where('student_id', $student->id)->count();
        $present = Attendance::where('student_id', $student->id)->where('status', 'present')->count();

        return [
            'total' => $total,
            'present' => $present,
            'percentage' => $total > 0 ? round(($present / $total) * 100) : 0,
        ];
    }

    private function payments(Student $student): array
    {
        $courseFee = $this->courseFeeFor($student);
        $paidPayments = Payment::where('student_id', $student->id)->where('status', 'paid')->get();
        $paidMonths = $paidPayments->pluck('month')->unique()->toArray();
        $dueMonths = array_values(array_diff($this->billableMonths($student), $paidMonths));

        return [
            'course_fee' => $courseFee,
            'total_paid' => $paidPayments->sum('amount'),
            'total_due' => count($dueMonths) * $courseFee,
            'due_months' => $dueMonths,
            'pending_count' => Payment::where('student_id', $student->id)->where('status', 'pending')->count(),
        ];
    }

    private function upcoming(Student $student): array
    {
        $courseId = $student->current_batch_id
            ? $student->batch?->course_id
            : $student->admission?->course_id;

        $events = AcademicEvent::whereDate('date', '>=', today())
            ->orderBy('date')
            ->limit(5)
            ->get(['id', 'title', 'type', 'date', 'description'])
            ->map(fn ($event) => [
                'id' => 'event-' . $event->id,
                'title' => $event->title,
                'type' => $event->type,
                'date' => $event->date,
                'description' => $event->description,
            ]);

        $exams = collect();
        if ($courseId) {
            $exams = Exam::where('course_id', $courseId)
                ->whereDate('date', '>=', today())
                ->orderBy('date')
                ->limit(5)
                ->get(['id', 'name', 'date'])
                ->map(fn ($exam) => [
                    'id' => 'exam-' . $exam->id,
                    'title' => $exam->name,
                    'type' => 'exam',
                    'date' => $exam->date,
                    'description' => 'Scheduled exam',
                ]);
        }

        return $events->concat($exams)
            ->sortBy(fn ($item) => Carbon::parse($item['date'])->timestamp)
            ->values()
            ->take(6)
            ->all();
    }

    private function recentResults(Student $student)
    {
        return ExamResult::where('student_id', $student->id)
            ->with('exam.course')
            ->latest()
            ->limit(3)
            ->get();
    }

    private function courseFeeFor(Student $student): float
    {
        if ($student->batch && $student->batch->course) {
            return (float) $student->batch->course->fee;
        }

        if ($student->admission && $student->admission->course) {
            return (float) $student->admission->course->fee;
        }

        return 0.0;
    }

    private function billableMonths(Student $student): array
    {
        $cursor = Carbon::parse($student->admission_date)->startOfMonth();
        $current = Carbon::now()->startOfMonth();
        $months = [];

        while ($cursor->lte($current)) {
            $months[] = $cursor->format('F Y');
            $cursor->addMonth();
        }

        return $months;
    }
}
