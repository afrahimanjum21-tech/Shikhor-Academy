<?php
namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\AdminAdmissionNotificationMail;

class AdmissionController extends Controller
{
    public function submit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required',
            'email' => 'required|email',
            'phone' => 'required',
            'course_id' => 'required',
            'father_name' => 'required',
            'mother_name' => 'required',
            // বাকিগুলো অপশনাল রাখা হলো যাতে এরর না দেয়
        ]);

        if ($validator->fails()) return response()->json(['message' => $validator->errors()->first()], 422);

        try {
            $data = $request->only([
                'full_name', 'father_name', 'mother_name', 'phone', 'email', 'dob', 'address', 'course_id',
                'gender', 'nationality', 'religion', 'blood_group',
                'father_mobile', 'father_email', 'father_occupation',
                'mother_mobile', 'mother_email', 'mother_occupation',
                'permanent_address',
                'emergency_name', 'emergency_mobile', 'emergency_relation',
                'last_school', 'jsc_gpa', 'ssc_gpa'
            ]);
            
            if ($request->hasFile('photo')) {
                $file = $request->file('photo');
                $filename = 'student_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                $destinationPath = public_path('uploads/admission_photos');
                if (!File::exists($destinationPath)) File::makeDirectory($destinationPath, 0755, true, true);
                $file->move($destinationPath, $filename);
                $data['photo_path'] = 'uploads/admission_photos/' . $filename;
            }

            $data['status'] = 'pending';
            $application = AdmissionApplication::create($data);

            // Admin কে ইমেইল পাঠানো (dynamic SMTP + admission_email from settings)
            try {
                $application->load('course');

                $courseName = $application->course ? $application->course->name : 'a course';
                NotificationService::createForAdmins(
                    'admission',
                    'New Admission',
                    $request->full_name . ' submitted an admission application for ' . $courseName . '.',
                    '/admin/admissions',
                    'Review',
                    'critical',
                    '📋'
                );

                $settings = \App\Models\SiteSetting::instance();
                \App\Models\SiteSetting::applySmtpConfig();

                // In dev/testing, skip placeholder addresses to avoid sending to sample data
                $isPlaceholder = function ($email) {
                    if (!str_ends_with((string) $email, '@uttoron.com')) {
                        return false;
                    }
                    if (app()->environment('local', 'testing')) {
                        return true;
                    }
                    Log::warning("AdmissionController: placeholder email configured in non-dev environment", ['email' => $email]);
                    return false;
                };

                $recipients = [];
                if (filled($settings->admission_email) && !$isPlaceholder($settings->admission_email)) {
                    $recipients[] = $settings->admission_email;
                }
                if (filled($settings->smtp_from_address) && !$isPlaceholder($settings->smtp_from_address)) {
                    if (!in_array($settings->smtp_from_address, $recipients)) {
                        $recipients[] = $settings->smtp_from_address;
                    }
                }
                $fallbackAdmins = User::where('role', 'super_admin')->where('is_active', true)->pluck('email')->toArray();
                foreach ($fallbackAdmins as $email) {
                    if (filled($email) && !$isPlaceholder($email) && !in_array($email, $recipients)) {
                        $recipients[] = $email;
                    }
                }

                if (empty($recipients)) {
                    throw new \Exception('No valid recipient emails configured.');
                }

                $details = [
                    'name' => $application->full_name,
                    'email' => $application->email,
                    'phone' => $application->phone,
                    'course' => $application->course ? $application->course->title : 'N/A',
                    'application_id' => $application->id,
                    'date' => $application->created_at->format('d M Y, h:i A'),
                    'admin_url' => rtrim(config('app.frontend_url'), '/'),
                ];

                Mail::to($recipients)->send(new AdminAdmissionNotificationMail($details));
            } catch (\Exception $e) {
                Log::error("Admin notification email failed: " . $e->getMessage());
            }

            return response()->json(['message' => 'Application submitted successfully!', 'application_id' => $application->id], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
}