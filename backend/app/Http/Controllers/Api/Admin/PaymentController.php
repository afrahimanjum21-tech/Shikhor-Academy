<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ExamResult;
use App\Models\Payment;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function index()
    {
        return Payment::with('student.user')->latest()->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'month' => ['required', 'string', 'max:30'],
            'date' => ['required', 'date'],
            'method' => ['required', 'string', 'max:30'],
            'trx_id' => ['nullable', 'string', 'max:100'],
        ]);

        $month = trim($request->month);
        $alreadyPaid = Payment::where('student_id', $request->student_id)
            ->where('month', $month)
            ->where('status', 'paid')
            ->exists();

        if ($alreadyPaid) {
            return response()->json(['message' => 'This month is already paid for the selected student'], 409);
        }

        Payment::create([
            'student_id' => $request->student_id,
            'amount' => $request->amount,
            'month' => $month,
            'date' => $request->date,
            'method' => $request->method,
            'trx_id' => $request->trx_id ?: 'TXN-' . time(),
            'status' => 'paid',
        ]);

        return response()->json(['message' => 'Payment Recorded Successfully']);
    }

    public function destroy($id)
    {
        Payment::findOrFail($id)->delete();

        return response()->json(['message' => 'Payment Deleted']);
    }

    public function studentFinancialStatus()
    {
        $user = Auth::user();
        $student = Student::where('user_id', $user->id)
            ->with(['batch.course', 'admission.course'])
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $courseFee = $this->courseFeeFor($student);
        $allMonths = $this->billableMonths($student);
        $payments = Payment::where('student_id', $student->id)->latest()->get();

        $paidPayments = $payments->where('status', 'paid')->values();
        $paidMonths = $paidPayments->pluck('month')->map(fn($m) => strtolower(trim($m)))->unique()->toArray();

        // Pending payments that are NOT for an already-paid month (avoid stale rows)
        $pendingPayments = $payments->filter(function ($p) use ($paidMonths) {
            return $p->status === 'pending'
                && !in_array(strtolower(trim($p->month)), $paidMonths);
        })->values();

        // History shown to student: paid + active pending only (hide stale due/pending
        // rows for months that are already settled, so the list stays clean).
        $history = $payments->filter(function ($p) use ($paidMonths) {
            if ($p->status === 'paid') return true;
            // For non-paid rows, only show if that month is not yet paid
            return !in_array(strtolower(trim($p->month)), $paidMonths);
        })->values();

        // Due months: billable months minus paid months (case-insensitive)
        $normalizedAll = array_map(fn($m) => strtolower(trim($m)), $allMonths);
        $dueMonthsNorm = array_values(array_diff($normalizedAll, $paidMonths));
        // Map back to the original formatted names
        $dueMonths = [];
        foreach ($allMonths as $m) {
            if (in_array(strtolower(trim($m)), $dueMonthsNorm)) {
                $dueMonths[] = $m;
            }
        }

        return response()->json([
            'course_fee' => $courseFee,
            'total_paid' => $paidPayments->sum('amount'),
            'total_due' => count($dueMonths) * $courseFee,
            'due_months' => $dueMonths,
            'pending_payments' => $pendingPayments,
            'history' => $history,
        ]);
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
        // Use admission_date if present, otherwise fall back to the student
        // record's created_at (the moment they were admitted into the system).
        $start = $student->admission_date ?: $student->created_at;
        if (blank($start)) {
            return [];
        }

        $cursor = Carbon::parse($start)->startOfMonth();
        $current = Carbon::now()->startOfMonth();

        // Safety: never go backwards or compute a huge range
        if ($cursor->gt($current)) {
            return [$cursor->format('F Y')];
        }

        $months = [];
        while ($cursor->lte($current)) {
            $months[] = $cursor->format('F Y');
            $cursor->addMonth();
        }

        return $months;
    }

    /**
     * Admin: Get exam results for a specific student
     * Note: $id is the USER id (consistent with /admin/student/{id} route)
     */
    public function studentExamResults($id)
    {
        $student = Student::where('user_id', $id)->with('user')->first();
        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $results = ExamResult::where('student_id', $student->id)
            ->with('exam.course')
            ->latest()
            ->get();

        $summary = [
            'total_exams' => $results->count(),
            'average_gpa' => $results->count() > 0 ? round($results->avg('gpa'), 2) : 0,
            'highest_gpa' => $results->max('gpa') ?? 0,
            'lowest_gpa' => $results->min('gpa') ?? 0,
        ];

        return response()->json([
            'student' => $student,
            'results' => $results,
            'summary' => $summary,
        ]);
    }

    /**
     * Admin: Get attendance history for a specific student
     * Note: $id is the USER id (consistent with /admin/student/{id} route)
     */
    public function studentAttendance($id)
    {
        $student = Student::where('user_id', $id)->with('user')->first();
        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $records = Attendance::where('student_id', $student->id)
            ->latest('date')
            ->get();

        $total = $records->count();
        $present = $records->where('status', 'present')->count();
        $absent = $records->where('status', 'absent')->count();
        $late = $records->where('status', 'late')->count();

        // Group by month
        $monthlyStats = $records->groupBy(function ($record) {
            return Carbon::parse($record->date)->format('F Y');
        })->map(function ($monthRecords) {
            $mTotal = $monthRecords->count();
            $mPresent = $monthRecords->where('status', 'present')->count();
            return [
                'total' => $mTotal,
                'present' => $mPresent,
                'absent' => $mTotal - $mPresent,
                'percentage' => $mTotal > 0 ? round(($mPresent / $mTotal) * 100, 1) : 0,
            ];
        });

        return response()->json([
            'student' => $student,
            'records' => $records,
            'summary' => [
                'total_classes' => $total,
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'percentage' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
            ],
            'monthly_stats' => $monthlyStats,
        ]);
    }

    /**
     * Admin: Get payment history for a specific student
     * Note: $id is the USER id (consistent with /admin/student/{id} route)
     */
    public function studentPaymentHistory($id)
    {
        $student = Student::where('user_id', $id)
            ->with(['user', 'batch.course', 'admission.course'])
            ->first();
        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $courseFee = $this->courseFeeFor($student);
        $allMonths = $this->billableMonths($student);
        $payments = Payment::where('student_id', $student->id)->latest()->get();

        $paidPayments = $payments->where('status', 'paid')->values();
        $paidMonthsNorm = $paidPayments->pluck('month')
            ->map(fn($m) => strtolower(trim($m)))
            ->unique()
            ->toArray();

        // Only show pending payments for months NOT yet paid
        $pendingPayments = $payments->filter(function ($p) use ($paidMonthsNorm) {
            return $p->status === 'pending'
                && !in_array(strtolower(trim($p->month)), $paidMonthsNorm);
        })->values();

        // Only show due payments for months NOT yet paid
        $duePayments = $payments->filter(function ($p) use ($paidMonthsNorm) {
            return $p->status === 'due'
                && !in_array(strtolower(trim($p->month)), $paidMonthsNorm);
        })->values();

        // Clean history: paid + active non-paid (no stale rows for already-paid months)
        $cleanPayments = $payments->filter(function ($p) use ($paidMonthsNorm) {
            if ($p->status === 'paid') return true;
            return !in_array(strtolower(trim($p->month)), $paidMonthsNorm);
        })->values();

        // Due months calculation (case-insensitive)
        $normalizedAll = array_map(fn($m) => strtolower(trim($m)), $allMonths);
        $dueMonthsNorm = array_values(array_diff($normalizedAll, $paidMonthsNorm));
        $dueMonths = [];
        foreach ($allMonths as $m) {
            if (in_array(strtolower(trim($m)), $dueMonthsNorm)) {
                $dueMonths[] = $m;
            }
        }

        $paidMonths = $paidPayments->pluck('month')->unique()->toArray();

        // Monthly breakdown: for each billable month, find the BEST matching record
        $monthlyBreakdown = collect($allMonths)->map(function ($month) use ($payments, $courseFee, $paidMonthsNorm) {
            // Look for paid record first (case-insensitive match)
            $paidRecord = $payments->first(function ($p) use ($month) {
                return $p->status === 'paid' && strtolower(trim($p->month)) === strtolower(trim($month));
            });
            if ($paidRecord) {
                return [
                    'month' => $month,
                    'fee' => $courseFee,
                    'status' => 'paid',
                    'amount' => (float) $paidRecord->amount,
                    'method' => $paidRecord->method,
                    'date' => $paidRecord->date,
                    'trx_id' => $paidRecord->trx_id,
                ];
            }
            // Then look for pending/due
            $record = $payments->first(fn($p) => strtolower(trim($p->month)) === strtolower(trim($month)));
            return [
                'month' => $month,
                'fee' => $courseFee,
                'status' => $record ? $record->status : 'due',
                'amount' => $record ? (float) $record->amount : $courseFee,
                'method' => $record ? $record->method : null,
                'date' => $record ? $record->date : null,
                'trx_id' => $record ? $record->trx_id : null,
            ];
        });

        return response()->json([
            'student' => $student,
            'course_fee' => $courseFee,
            'all_months' => $allMonths,
            'paid_months' => $paidMonths,
            'due_months' => $dueMonths,
            'total_paid' => $paidPayments->sum('amount'),
            'total_due' => count($dueMonths) * $courseFee,
            'payments' => $cleanPayments,
            'paid_payments' => $paidPayments,
            'pending_payments' => $pendingPayments,
            'due_payments' => $duePayments,
            'monthly_breakdown' => $monthlyBreakdown,
        ]);
    }
}
