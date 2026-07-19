<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    private array $sessions = ['morning', 'evening'];

    public function getSheet(Request $request)
    {
        $courseId = $request->query('course_id');
        $date = $request->query('date');
        $session = $request->query('session', 'morning');

        $students = $this->studentsForCourse($courseId)->with('user')->get();
        $attendance = Attendance::where('course_id', $courseId)
            ->where('date', $date)
            ->where('session', $session)
            ->get()
            ->keyBy('student_id');

        return response()->json($students->map(function ($student) use ($attendance) {
            return [
                'student_id' => $student->id,
                'name' => $student->user->name,
                'card_no' => $student->student_id_card_no,
                'status' => isset($attendance[$student->id]) ? $attendance[$student->id]->status : 'pending',
            ];
        }));
    }

    public function monthlySheet(Request $request)
    {
        $validated = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'month' => ['required', 'date_format:Y-m'],
        ]);

        $start = Carbon::createFromFormat('Y-m-d', $validated['month'] . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $daysInMonth = $start->daysInMonth;
        $students = $this->studentsForCourse($validated['course_id'])
            ->with('user')
            ->orderBy('student_id_card_no')
            ->get();

        $records = Attendance::where('course_id', $validated['course_id'])
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->groupBy('student_id');

        $dailySummary = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dailySummary[$day] = [
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'leave' => 0,
                'total_sessions' => $students->count() * count($this->sessions),
            ];
        }

        $sheet = $students->map(function ($student) use ($records, $daysInMonth, &$dailySummary) {
            $studentRecords = ($records[$student->id] ?? collect())
                ->keyBy(fn ($item) => Carbon::parse($item->date)->day . '_' . $item->session);

            $days = [];
            $present = 0;
            $absent = 0;
            $late = 0;
            $leave = 0;
            $marked = 0;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $days[$day] = [];

                foreach ($this->sessions as $session) {
                    $record = $studentRecords[$day . '_' . $session] ?? null;
                    $cell = $record ? [
                        'id' => $record->id,
                        'session' => $session,
                        'status' => $record->status,
                        'punch_in_at' => $record->punch_in_at,
                        'punch_out_at' => $record->punch_out_at,
                        'leave_status' => $record->leave_status,
                        'leave_reason' => $record->leave_reason,
                    ] : [
                        'id' => null,
                        'session' => $session,
                        'status' => null,
                        'punch_in_at' => null,
                        'punch_out_at' => null,
                        'leave_status' => 'none',
                        'leave_reason' => null,
                    ];

                    $days[$day][$session] = $cell;

                    if ($record) {
                        $marked++;
                        if ($record->leave_status === 'approved') {
                            $leave++;
                            $dailySummary[$day]['leave']++;
                        } elseif ($record->status === 'present') {
                            $present++;
                            $dailySummary[$day]['present']++;
                        } elseif ($record->status === 'absent') {
                            $absent++;
                            $dailySummary[$day]['absent']++;
                        } elseif ($record->status === 'late') {
                            $late++;
                            $dailySummary[$day]['late']++;
                        }
                    }
                }
            }

            return [
                'student_id' => $student->id,
                'name' => $student->user->name,
                'card_no' => $student->student_id_card_no,
                'days' => $days,
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'leave' => $leave,
                'marked' => $marked,
                'percentage' => $marked > 0 ? round((($present + $leave) / $marked) * 100, 1) : 0,
            ];
        });

        return response()->json([
            'course_id' => (int) $validated['course_id'],
            'month' => $validated['month'],
            'days_in_month' => $daysInMonth,
            'sessions' => $this->sessions,
            'weekends' => $this->weekends($start, $daysInMonth),
            'sheet' => $sheet,
            'daily_summary' => $dailySummary,
            'leave_requests' => $this->leaveRequestsQuery($validated['course_id'])->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['required', 'date'],
            'session' => ['nullable', Rule::in($this->sessions)],
            'attendances' => ['required', 'array'],
            'attendances.*.student_id' => ['required', 'exists:students,id'],
            'attendances.*.status' => ['required', 'in:present,absent,late'],
        ]);

        foreach ($request->attendances as $item) {
            Attendance::updateOrCreate(
                [
                    'student_id' => $item['student_id'],
                    'course_id' => $request->course_id,
                    'date' => $request->date,
                    'session' => $request->input('session', 'morning'),
                ],
                ['status' => $item['status']]
            );
        }

        return response()->json(['message' => 'Attendance Saved Successfully!']);
    }

    public function saveCell(Request $request)
    {
        $validated = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['required', 'date'],
            'session' => ['required', Rule::in($this->sessions)],
            'status' => ['required', 'in:present,absent,late'],
            'punch_in_at' => ['nullable', 'date_format:H:i'],
            'punch_out_at' => ['nullable', 'date_format:H:i'],
        ]);

        Attendance::updateOrCreate(
            [
                'student_id' => $validated['student_id'],
                'course_id' => $validated['course_id'],
                'date' => $validated['date'],
                'session' => $validated['session'],
            ],
            [
                'status' => $validated['status'],
                'punch_in_at' => $validated['punch_in_at'] ?? null,
                'punch_out_at' => $validated['punch_out_at'] ?? null,
            ]
        );

        return response()->json(['message' => 'Attendance updated']);
    }

    public function leaveRequests(Request $request)
    {
        return response()->json($this->leaveRequestsQuery($request->query('course_id'))->get());
    }

    public function requestLeave(Request $request)
    {
        $validated = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['required', 'date'],
            'session' => ['required', Rule::in($this->sessions)],
            'punch_out_at' => ['required', 'date_format:H:i'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $student = Student::where('user_id', Auth::id())->firstOrFail();

        $attendance = Attendance::updateOrCreate(
            [
                'student_id' => $student->id,
                'course_id' => $validated['course_id'],
                'date' => $validated['date'],
                'session' => $validated['session'],
            ],
            [
                'status' => 'present',
                'punch_out_at' => $validated['punch_out_at'],
                'leave_status' => 'pending',
                'leave_reason' => $validated['reason'],
                'leave_requested_at' => now(),
            ]
        );

        $this->notifyAdminsAboutLeave($attendance);

        return response()->json(['message' => 'Leave request submitted for admin approval']);
    }

    public function punchIn(Request $request)
    {
        $validated = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['nullable', 'date'],
            'session' => ['required', Rule::in($this->sessions)],
        ]);

        $student = Student::where('user_id', Auth::id())->firstOrFail();
        $date = $validated['date'] ?? today()->toDateString();
        $time = now()->format('H:i');
        $lateAfter = $validated['session'] === 'morning' ? '08:15' : '15:15';

        $attendance = Attendance::updateOrCreate(
            [
                'student_id' => $student->id,
                'course_id' => $validated['course_id'],
                'date' => $date,
                'session' => $validated['session'],
            ],
            [
                'status' => $time > $lateAfter ? 'late' : 'present',
                'punch_in_at' => $time,
            ]
        );

        return response()->json(['message' => 'Punch in recorded', 'attendance' => $attendance]);
    }

    public function punchOut(Request $request)
    {
        $validated = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['nullable', 'date'],
            'session' => ['required', Rule::in($this->sessions)],
        ]);

        $student = Student::where('user_id', Auth::id())->firstOrFail();
        $date = $validated['date'] ?? today()->toDateString();

        $attendance = Attendance::updateOrCreate(
            [
                'student_id' => $student->id,
                'course_id' => $validated['course_id'],
                'date' => $date,
                'session' => $validated['session'],
            ],
            [
                'status' => 'present',
                'punch_out_at' => now()->format('H:i'),
            ]
        );

        return response()->json(['message' => 'Punch out recorded', 'attendance' => $attendance]);
    }

    public function approveLeave(Attendance $attendance)
    {
        $attendance->update([
            'leave_status' => 'approved',
            'leave_approved_at' => now(),
            'leave_approved_by' => Auth::id(),
        ]);

        try {
            $attendance->load('student.user');
            $studentEmail = $attendance->student?->user?->email;
            $studentName = $attendance->student?->user?->name ?? 'Student';
            if ($studentEmail) {
                Mail::raw(
                    "Dear {$studentName},\n\nYour leave request for {$attendance->date} ({$attendance->session}) has been APPROVED.\n\nReason: {$attendance->leave_reason}\nPunch out time: {$attendance->punch_out_at}\n\nBest regards,\nUttoron Coaching Center",
                    fn ($message) => $message
                        ->to($studentEmail)
                        ->subject('Leave request approved')
                );
            }
        } catch (\Throwable $e) {
            Log::error('Leave approval email failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Leave request approved']);
    }

    public function rejectLeave(Attendance $attendance)
    {
        $attendance->update([
            'leave_status' => 'rejected',
            'leave_approved_at' => now(),
            'leave_approved_by' => Auth::id(),
        ]);

        try {
            $attendance->load('student.user');
            $studentEmail = $attendance->student?->user?->email;
            $studentName = $attendance->student?->user?->name ?? 'Student';
            if ($studentEmail) {
                Mail::raw(
                    "Dear {$studentName},\n\nYour leave request for {$attendance->date} ({$attendance->session}) has been REJECTED.\n\nReason given: {$attendance->leave_reason}\n\nBest regards,\nUttoron Coaching Center",
                    fn ($message) => $message
                        ->to($studentEmail)
                        ->subject('Leave request rejected')
                );
            }
        } catch (\Throwable $e) {
            Log::error('Leave rejection email failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Leave request rejected']);
    }

    public function reviewLeave(Request $request, Attendance $attendance)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
        ]);

        return $validated['status'] === 'approved'
            ? $this->approveLeave($attendance)
            : $this->rejectLeave($attendance);
    }

    public function studentStats()
    {
        $student = Student::where('user_id', Auth::id())->first();

        if (!$student) {
            return response()->json(['total' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'leave' => 0, 'percentage' => 0]);
        }

        $records = Attendance::where('student_id', $student->id)->get();
        $totalClasses = $records->count();
        $presentCount = $records->where('status', 'present')->where('leave_status', '!=', 'approved')->count();
        $absentCount = $records->where('status', 'absent')->count();
        $lateCount = $records->where('status', 'late')->count();
        $leaveCount = $records->where('leave_status', 'approved')->count();

        return response()->json([
            'total' => $totalClasses,
            'present' => $presentCount,
            'absent' => $absentCount,
            'late' => $lateCount,
            'leave' => $leaveCount,
            'percentage' => $totalClasses > 0 ? round((($presentCount + $leaveCount) / $totalClasses) * 100) : 0,
        ]);
    }

    private function studentsForCourse($courseId)
    {
        return Student::query()
            ->whereHas('batch', fn ($query) => $query->where('course_id', $courseId))
            ->orWhereHas('admission', fn ($query) => $query->where('course_id', $courseId));
    }

    private function weekends(Carbon $start, int $daysInMonth): array
    {
        $weekends = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            if ($start->copy()->day($day)->isFriday()) {
                $weekends[] = $day;
            }
        }

        return $weekends;
    }

    private function leaveRequestsQuery($courseId = null)
    {
        return Attendance::with(['student.user'])
            ->where('leave_status', 'pending')
            ->when($courseId, fn ($query) => $query->where('course_id', $courseId))
            ->latest('leave_requested_at');
    }

    private function notifyAdminsAboutLeave(Attendance $attendance): void
    {
        try {
            $attendance->load('student.user');
            $admins = User::whereIn('role', ['admin', 'super_admin'])->pluck('email')->filter();
            if ($admins->isEmpty()) {
                return;
            }

            $studentName = $attendance->student?->user?->name ?? 'Student';
            Mail::raw(
                "{$studentName} requested early leave for {$attendance->date} ({$attendance->session}).\n\nReason: {$attendance->leave_reason}\nPunch out: {$attendance->punch_out_at}",
                fn ($message) => $message
                    ->to($admins->all())
                    ->subject('Early leave request pending approval')
            );
        } catch (\Throwable $e) {
            Log::error('Leave request email failed: ' . $e->getMessage());
        }
    }
}
