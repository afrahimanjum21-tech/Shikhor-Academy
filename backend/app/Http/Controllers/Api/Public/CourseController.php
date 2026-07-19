<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\User;
use App\Models\Student;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return Course::with('courseCategory')
            ->where('is_active', true)
            ->orderBy('sorting_order')
            ->orderBy('title')
            ->paginate($perPage);
    }

    public function categories(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return CourseCategory::visible()->ordered()->paginate($perPage);
    }

    public function stats()
    {
        $courseCount = Course::where('is_active', true)->count();
        $studentCount = Student::count();
        $teacherCount = User::where('role', 'teacher')->where('is_active', true)->count();

        $totalAdmissions = \App\Models\AdmissionApplication::count();
        $approvedAdmissions = \App\Models\AdmissionApplication::where('status', 'approved')->count();
        $successRate = $totalAdmissions > 0
            ? round(($approvedAdmissions / $totalAdmissions) * 100)
            : 98;

        return response()->json([
            'courses' => $courseCount,
            'students' => $studentCount,
            'teachers' => $teacherCount,
            'success_rate' => $successRate,
        ]);
    }

    public function bySlug($slug)
    {
        $course = Course::with('courseCategory')
            ->where('is_active', true)
            ->where('slug', $slug)
            ->firstOrFail();
        return $course;
    }

    public function featured()
    {
        return Course::with('courseCategory')
            ->where('is_active', true)
            ->where('is_featured', true)
            ->orderBy('sorting_order')
            ->take(6)
            ->get();
    }

    public function show($id)
    {
        $course = Course::with('courseCategory')
            ->where('is_active', true)
            ->findOrFail($id);
        return $course;
    }
}
