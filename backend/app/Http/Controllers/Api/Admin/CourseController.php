<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class CourseController extends Controller
{
    public function index()
    {
        return Course::latest()->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string',
            'fee' => 'required|numeric',
        ]);

        $course = Course::create([
            'title' => $request->title,
            'slug' => Str::slug($request->title) . '-' . Str::random(4),
            'category' => $request->category,
            'fee' => $request->fee,
            'description' => $request->description,
            'is_active' => true
        ]);

        return response()->json(['message' => 'Course created successfully', 'course' => $course]);
    }

    public function update(Request $request, $id)
    {
        $course = Course::findOrFail($id);
        
        $request->validate([
            'title' => 'required|string|max:255',
            'fee' => 'required|numeric',
        ]);

        $course->update($request->all());
        return response()->json(['message' => 'Course updated successfully']);
    }

    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                // ১. এই কোর্সের সব ব্যাচ খুঁজে বের করা
                $batchIds = DB::table('batches')->where('course_id', $id)->pluck('id');

                // ২. যেসব ছাত্র এই ব্যাচগুলোতে আছে, তাদের ব্যাচ নাল (Empty) করে দেওয়া
                // (ছাত্র ডিলিট হবে না, শুধু ব্যাচ থেকে বের হয়ে যাবে)
                DB::table('students')
                    ->whereIn('current_batch_id', $batchIds)
                    ->update(['current_batch_id' => null]);

                // ৩. ব্যাচের রুটিন ডিলিট করা
                DB::table('routines')->whereIn('batch_id', $batchIds)->delete();

                // ৪. ব্যাচগুলো ডিলিট করা
                DB::table('batches')->where('course_id', $id)->delete();

                // ৫. এক্সাম এবং রেজাল্ট ডিলিট করা
                $examIds = DB::table('exams')->where('course_id', $id)->pluck('id');
                DB::table('exam_results')->whereIn('exam_id', $examIds)->delete();
                DB::table('exams')->where('course_id', $id)->delete();

                // ৬. অ্যাডমিশন রিকোয়েস্ট ডিলিট করা
                DB::table('admission_applications')->where('course_id', $id)->delete();

                // ৭. লাইব্রেরি ম্যাটেরিয়ালস ডিলিট (যদি কোর্স আইডি থাকে)
                // আমাদের বর্তমান লজিকে ম্যাটেরিয়ালে কোর্স আইডি নেই, থাকলে লাগত

                // ৮. সবশেষে কোর্সটি ডিলিট
                DB::table('courses')->where('id', $id)->delete();
            });

            return response()->json(['message' => 'Course deleted successfully']);

        } catch (\Exception $e) {
            // আসল এররটি ফ্রন্টএন্ডে পাঠানো হবে
            return response()->json(['message' => 'Delete Failed: ' . $e->getMessage()], 500);
        }
    }
}