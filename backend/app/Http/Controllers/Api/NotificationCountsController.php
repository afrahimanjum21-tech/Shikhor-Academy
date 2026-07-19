<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicEvent;
use App\Models\AdmissionApplication;
use App\Models\Album;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Attendance;
use App\Models\ElearningVideo;
use App\Models\ExamResult;
use App\Models\Payment;
use App\Models\Routine;
use App\Models\Student;
use App\Models\StudyMaterial;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class NotificationCountsController extends Controller
{
    public function counts(Request $request)
    {
        $user = $request->user();

        return match ($user->role) {
            'admin', 'super_admin' => $this->adminCounts($request),
            'teacher' => $this->teacherCounts($user, $request),
            'student' => $this->studentCounts($user, $request),
            default => response()->json([]),
        };
    }

    private function adminCounts(Request $request)
    {
        $sinceAdmissions = $request->query('since_admissions');
        $sinceLeaves = $request->query('since_leaves');
        $sincePayments = $request->query('since_payments');

        $pendingAdmissions = AdmissionApplication::where('status', 'pending');
        if ($sinceAdmissions) {
            $pendingAdmissions->where('created_at', '>', $sinceAdmissions);
        }

        $holdAdmissions = AdmissionApplication::where('status', 'hold');
        if ($sinceAdmissions) {
            $holdAdmissions->where('created_at', '>', $sinceAdmissions);
        }

        $leaves = Attendance::where('leave_status', 'pending');
        if ($sinceLeaves) {
            $leaves->where('created_at', '>', $sinceLeaves);
        }

        $payments = Payment::where('status', 'pending');
        if ($sincePayments) {
            $payments->where('created_at', '>', $sincePayments);
        }

        $sinceMessages = $request->query('since_messages');
        $messages = ContactMessage::unread();
        if ($sinceMessages) {
            $messages->where('created_at', '>', $sinceMessages);
        }

        return response()->json([
            'pending_admissions' => $pendingAdmissions->count(),
            'hold_admissions' => $holdAdmissions->count(),
            'pending_leave_requests' => $leaves->count(),
            'pending_payments' => $payments->count(),
            'unread_messages' => $messages->count(),
        ]);
    }

    private function teacherCounts($user, Request $request)
    {
        $since = $request->query('since_reviews');

        $submissions = AssignmentSubmission::where('status', 'submitted')
            ->whereHas('assignment', fn($q) => $q->where('teacher_id', $user->id));

        if ($since) {
            $submissions->where('updated_at', '>', $since);
        }

        return response()->json([
            'pending_reviews' => $submissions->count(),
        ]);
    }

    private function studentCounts($user, Request $request)
    {
        $student = Student::where('user_id', $user->id)->first();

        $pendingAssignments = 0;
        $recentlyReviewed = 0;
        $newMaterials = 0;
        $newAlbums = 0;
        $newExamResults = 0;
        $updatedRoutine = 0;
        $newEvents = 0;
        $newActivities = 0;
        $attendanceUpdates = 0;
        $pendingFees = 0;
        $newVideos = 0;

        if ($student && $student->current_batch_id) {
            $sinceAssignments = $request->query('since_assignments');
            $sinceResults = $request->query('since_results');

            $query = Assignment::where('batch_id', $student->current_batch_id);
            if ($sinceAssignments) {
                $query->where('created_at', '>', $sinceAssignments);
            }
            $pendingAssignments = $query->count();

            $reviewed = AssignmentSubmission::where('student_id', $student->id)
                ->where('status', 'reviewed');
            if ($sinceResults) {
                $reviewed->where('updated_at', '>', $sinceResults);
            }
            $recentlyReviewed = $reviewed->count();
        }

        if ($student) {
            $sinceResults = $request->query('since_exam_results');
            $resultsQuery = ExamResult::where('student_id', $student->id);
            if ($sinceResults) {
                $resultsQuery->where('created_at', '>', $sinceResults);
            }
            $newExamResults = $resultsQuery->count();

            $sinceAttendance = $request->query('since_attendance');
            $attendanceQuery = Attendance::where('student_id', $student->id)
                ->whereNotNull('leave_status')
                ->where('leave_status', '!=', 'pending');
            if ($sinceAttendance) {
                $attendanceQuery->where('updated_at', '>', $sinceAttendance);
            }
            $attendanceUpdates = $attendanceQuery->count();

            $sinceFees = $request->query('since_fees');
            $feesQuery = Payment::where('student_id', $student->id)
                ->where('status', 'pending');
            if ($sinceFees) {
                $feesQuery->where('created_at', '>', $sinceFees);
            }
            $pendingFees = $feesQuery->count();
        }

        if ($student && $student->current_batch_id) {
            $sinceRoutine = $request->query('since_routine');
            $routineQuery = Routine::where('batch_id', $student->current_batch_id);
            if ($sinceRoutine) {
                $routineQuery->where('updated_at', '>', $sinceRoutine);
            }
            $updatedRoutine = $routineQuery->count();
        }

        // --- Public / global content counts ---
        $sinceLibrary = $request->query('since_library');
        $materialsQuery = StudyMaterial::query();
        if ($sinceLibrary) {
            $materialsQuery->where('created_at', '>', $sinceLibrary);
        }
        $newMaterials = $materialsQuery->count();

        $sinceGallery = $request->query('since_gallery');
        $albumsQuery = Album::query();
        if ($sinceGallery) {
            $albumsQuery->where('created_at', '>', $sinceGallery);
        }
        $newAlbums = $albumsQuery->count();

        $sinceCalendar = $request->query('since_calendar');
        $eventsQuery = AcademicEvent::query();
        if ($sinceCalendar) {
            $eventsQuery->where('created_at', '>', $sinceCalendar);
        }
        $newEvents = $eventsQuery->count();

        $sinceExtraCurricular = $request->query('since_extra_curricular');
        $activitiesQuery = AcademicEvent::where('type', 'event');
        if ($sinceExtraCurricular) {
            $activitiesQuery->where('created_at', '>', $sinceExtraCurricular);
        }
        $newActivities = $activitiesQuery->count();

        $sinceELearning = $request->query('since_e_learning');
        $videosQuery = ElearningVideo::query();
        if ($sinceELearning) {
            $videosQuery->where('created_at', '>', $sinceELearning);
        }
        $newVideos = $videosQuery->count();

        return response()->json([
            'pending_assignments' => $pendingAssignments,
            'recently_reviewed' => $recentlyReviewed,
            'new_materials' => $newMaterials,
            'new_albums' => $newAlbums,
            'new_exam_results' => $newExamResults,
            'updated_routine' => $updatedRoutine,
            'new_events' => $newEvents,
            'new_activities' => $newActivities,
            'attendance_updates' => $attendanceUpdates,
            'pending_fees' => $pendingFees,
            'new_videos' => $newVideos,
        ]);
    }
}
