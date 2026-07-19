<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Faculty;
use App\Models\Department;
use App\Models\Subject;
use App\Models\FacultyCategory;

class FacultyController extends Controller
{
    public function index(Request $request)
    {
        $query = Faculty::with([
            'department',
            'category',
            'subjects',
            'qualifications',
            'achievements',
            'certifications',
            'socialLinks',
            'gallery',
            'batches.course'
        ])
            ->where('public_profile_enabled', true)
            ->where('is_active', true);

        // Search
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', '%' . $request->search . '%')
                  ->orWhere('designation', 'like', '%' . $request->search . '%')
                  ->orWhere('specialization', 'like', '%' . $request->search . '%');
            });
        }

        // Filter by department
        if ($request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        // Filter by category
        if ($request->faculty_category_id) {
            $query->where('faculty_category_id', $request->faculty_category_id);
        }

        // Filter by subject
        if ($request->subject_id) {
            $query->whereHas('subjects', function ($q) use ($request) {
                $q->where('subject_id', $request->subject_id);
            });
        }

        // Filter by experience
        if ($request->min_experience) {
            $query->where('teaching_experience', '>=', $request->min_experience);
        }

        if ($request->max_experience) {
            $query->where('teaching_experience', '<=', $request->max_experience);
        }

        // Featured faculty first
        $query->orderBy('is_featured', 'desc')
              ->orderBy('display_order')
              ->orderBy('created_at', 'desc');

        $faculty = $query->paginate(20);

        return response()->json($faculty);
    }

    public function featured(Request $request)
    {
        $faculty = Faculty::with([
            'department',
            'category',
            'subjects',
            'qualifications',
            'achievements',
            'certifications',
            'socialLinks',
            'gallery',
            'batches.course'
        ])
            ->where('public_profile_enabled', true)
            ->where('is_active', true)
            ->where('is_featured', true)
            ->orderBy('display_order')
            ->orderBy('created_at', 'desc')
            ->limit($request->limit ?? 6)
            ->get();

        return response()->json($faculty);
    }

    public function show($slug)
    {
        $faculty = Faculty::with([
            'department',
            'category',
            'subjects',
            'qualifications',
            'achievements',
            'certifications',
            'socialLinks',
            'gallery',
            'batches.course'
        ])
        ->where('slug', $slug)
        ->where('public_profile_enabled', true)
        ->where('is_active', true)
        ->firstOrFail();

        return response()->json($faculty);
    }

    public function departments()
    {
        $departments = Department::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        return response()->json($departments);
    }

    public function subjects()
    {
        $subjects = Subject::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        return response()->json($subjects);
    }

    public function categories()
    {
        $categories = FacultyCategory::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($categories);
    }

    public function search(Request $request)
    {
        $query = Faculty::with([
            'department',
            'category',
            'subjects',
            'qualifications',
            'achievements',
            'certifications',
            'socialLinks',
            'gallery',
            'batches.course'
        ])
            ->where('public_profile_enabled', true)
            ->where('is_active', true);

        if ($request->q) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', '%' . $request->q . '%')
                  ->orWhere('designation', 'like', '%' . $request->q . '%')
                  ->orWhere('specialization', 'like', '%' . $request->q . '%')
                  ->orWhere('qualification', 'like', '%' . $request->q . '%');
            });
        }

        $faculty = $query->orderBy('is_featured', 'desc')
            ->orderBy('display_order')
            ->limit(20)
            ->get();

        return response()->json($faculty);
    }
}
