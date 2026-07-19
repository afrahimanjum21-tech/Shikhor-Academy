<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class CourseController extends Controller
{
    public function index()
    {
        return Course::with('courseCategory')->latest()->get();
    }

    public function show($id)
    {
        return Course::with('courseCategory')->findOrFail($id);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string',
            'category_id' => 'nullable|exists:course_categories,id',
            'fee' => 'required|numeric',
            'features' => 'nullable',
        ]);

        $data = $validated;

        if ($request->hasFile('thumbnail')) {
            $file = $request->file('thumbnail');
            $filename = 'course_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $destinationPath = public_path('uploads/courses');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }
            $file->move($destinationPath, $filename);
            $data['thumbnail'] = 'uploads/courses/' . $filename;
        }

        if (isset($data['features']) && is_string($data['features'])) {
            $data['features'] = array_filter(array_map('trim', explode("\n", $data['features'])));
        }

        $data['slug'] = Str::slug($request->title) . '-' . Str::random(4);

        $course = Course::create($data);

        return response()->json(['message' => 'Course created successfully', 'course' => $course->load('courseCategory')]);
    }

    public function update(Request $request, $id)
    {
        $course = Course::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string',
            'category_id' => 'nullable|exists:course_categories,id',
            'fee' => 'required|numeric',
            'features' => 'nullable',
        ]);

        $data = $validated;

        if ($request->hasFile('thumbnail')) {
            if ($course->thumbnail && File::exists(public_path($course->thumbnail))) {
                File::delete(public_path($course->thumbnail));
            }
            $file = $request->file('thumbnail');
            $filename = 'course_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $destinationPath = public_path('uploads/courses');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }
            $file->move($destinationPath, $filename);
            $data['thumbnail'] = 'uploads/courses/' . $filename;
        }

        if (isset($data['features']) && is_string($data['features'])) {
            $data['features'] = array_filter(array_map('trim', explode("\n", $data['features'])));
        }

        $course->update($data);

        return response()->json(['message' => 'Course updated successfully', 'course' => $course->fresh()->load('courseCategory')]);
    }

    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $batchIds = DB::table('batches')->where('course_id', $id)->pluck('id');
                DB::table('students')->whereIn('current_batch_id', $batchIds)->update(['current_batch_id' => null]);
                DB::table('routines')->whereIn('batch_id', $batchIds)->delete();
                DB::table('batches')->where('course_id', $id)->delete();
                $examIds = DB::table('exams')->where('course_id', $id)->pluck('id');
                DB::table('exam_results')->whereIn('exam_id', $examIds)->delete();
                DB::table('exams')->where('course_id', $id)->delete();
                DB::table('admission_applications')->where('course_id', $id)->delete();
                DB::table('courses')->where('id', $id)->delete();
            });
            return response()->json(['message' => 'Course deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Delete Failed: ' . $e->getMessage()], 500);
        }
    }

    public function toggleActive($id)
    {
        $course = Course::findOrFail($id);
        $course->is_active = !$course->is_active;
        $course->save();
        return response()->json(['message' => 'Course status toggled', 'is_active' => $course->is_active]);
    }

    public function toggleFeatured($id)
    {
        $course = Course::findOrFail($id);
        $course->is_featured = !$course->is_featured;
        $course->save();
        return response()->json(['message' => 'Course featured toggled', 'is_featured' => $course->is_featured]);
    }
}
