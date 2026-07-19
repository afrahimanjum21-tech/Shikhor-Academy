<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\Batch;
use App\Models\SiteSetting;
use App\Models\User;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Mail;
use App\Mail\AdmissionStatusMail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AdmissionManagerController extends Controller
{
    public function index()
    {
        return AdmissionApplication::with('course')->latest()->get();
    }

    public function approve($id, Request $request)
    {
        $app = AdmissionApplication::findOrFail($id);
        
        if($app->status !== 'pending') {
            return response()->json(['message' => 'Application already processed'], 400);
        }

        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6'
        ]);

        DB::beginTransaction();
        try {
            // ১. ইউজার একাউন্ট তৈরি
            $user = User::create([
                'name' => $app->full_name,
                'email' => $request->email, // অ্যাডমিনের দেওয়া লগইন ইমেইল
                'password' => $request->password,
                'role' => 'student',
                'phone' => $app->phone,
                'is_active' => true
            ]);

            // ২. স্টুডেন্ট প্রোফাইল তৈরি (সব ডাটা কপি করা হচ্ছে)
            $studentId = 'STU-' . date('Y') . '-' . str_pad($user->id, 4, '0', STR_PAD_LEFT);

            // অ্যাডমিশনের কোর্সের প্রথম ব্যাচটি অটো-অ্যাসাইন করুন
            $batch = Batch::where('course_id', $app->course_id)->first();
            
            Student::create([
                'user_id' => $user->id,
                'student_id_card_no' => $studentId,
                'admission_id' => $app->id,
                'current_batch_id' => $batch?->id,
                'guardian_phone' => $app->father_mobile ?? $app->phone,
                'admission_date' => now(),

                // 🔥 বিস্তারিত তথ্য কপি (Admission Table -> Student Table)
                'gender' => $app->gender,
                'nationality' => $app->nationality,
                'religion' => $app->religion,
                'blood_group' => $app->blood_group,
                'dob' => $app->dob,

                'father_name' => $app->father_name,
                'father_mobile' => $app->father_mobile,
                'father_occupation' => $app->father_occupation,
                
                'mother_name' => $app->mother_name,
                'mother_mobile' => $app->mother_mobile,
                'mother_occupation' => $app->mother_occupation,

                'present_address' => $app->address, // অ্যাডমিশন টেবিলে নাম ছিল 'address'
                'permanent_address' => $app->permanent_address,

                'emergency_name' => $app->emergency_name,
                'emergency_mobile' => $app->emergency_mobile,
                
                'last_school' => $app->last_school,
                'jsc_gpa' => $app->jsc_gpa,
                'ssc_gpa' => $app->ssc_gpa,
            ]);

            $app->update(['status' => 'approved']);

            // ৩. ইমেইল পাঠানো
            $this->sendEmail($app, 'approved', $request->email, $request->password);

            DB::commit();
            return response()->json(['message' => 'Student Approved & Data Synced!', 'student_id' => $studentId]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    // বাল্ক অ্যাকশন (একই লজিক)
    public function bulkAction(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'action' => 'required|in:approve,reject,hold'
        ]);

        $ids = $request->ids;
        $action = $request->action;
        $count = 0;

        foreach ($ids as $id) {
            $app = AdmissionApplication::with('course')->find($id);
            if (!$app || $app->status !== 'pending') continue;

            if ($action === 'approve') {
                $password = Str::random(8);
                
                $user = User::create([
                    'name' => $app->full_name,
                    'email' => $app->email, // বাল্কের সময় ছাত্রের ইমেইলই লগইন
                    'password' => $password,
                    'role' => 'student',
                    'phone' => $app->phone,
                    'is_active' => true
                ]);

                $studentId = 'STU-' . date('Y') . '-' . str_pad($user->id, 4, '0', STR_PAD_LEFT);

                $batch = Batch::where('course_id', $app->course_id)->first();
                
                Student::create([
                    'user_id' => $user->id,
                    'student_id_card_no' => $studentId,
                    'admission_id' => $app->id,
                    'current_batch_id' => $batch?->id,
                    'guardian_phone' => $app->father_mobile ?? $app->phone,
                    'admission_date' => now(),

                    // 🔥 বাল্ক অ্যাকশনেও ডাটা কপি
                    'gender' => $app->gender,
                    'nationality' => $app->nationality,
                    'religion' => $app->religion,
                    'blood_group' => $app->blood_group,
                    'dob' => $app->dob,

                    'father_name' => $app->father_name,
                    'father_mobile' => $app->father_mobile,
                    'father_occupation' => $app->father_occupation,
                    'mother_name' => $app->mother_name,
                    'mother_mobile' => $app->mother_mobile,
                    'mother_occupation' => $app->mother_occupation,

                    'present_address' => $app->address,
                    'permanent_address' => $app->permanent_address,

                    'emergency_name' => $app->emergency_name,
                    'emergency_mobile' => $app->emergency_mobile,
                    
                    'last_school' => $app->last_school,
                    'jsc_gpa' => $app->jsc_gpa,
                    'ssc_gpa' => $app->ssc_gpa,
                ]);

                $app->update(['status' => 'approved']);
                $this->sendEmail($app, 'approved', $app->email, $password);

            } elseif ($action === 'reject') {
                $app->update(['status' => 'rejected']);
                $this->sendEmail($app, 'rejected', $app->email);

            } elseif ($action === 'hold') {
                $app->update(['status' => 'hold']);
                $this->sendEmail($app, 'hold', $app->email);
            }
            $count++;
        }

        return response()->json(['message' => "$count applications processed successfully!"]);
    }

    private function sendEmail($app, $status, $loginEmail, $password = null)
    {
        try {
            SiteSetting::applySmtpConfig();

            $details = [
                'name' => $app->full_name,
                'email' => $app->email,
                'course' => $app->course ? $app->course->title : 'Course',
                'status' => $status,
                'login_email' => $loginEmail,
                'password' => $password
            ];
            Mail::to($app->email)->send(new AdmissionStatusMail($details));
        } catch (\Exception $e) {
            Log::error("Mail Failed: " . $e->getMessage());
        }
    }
}
