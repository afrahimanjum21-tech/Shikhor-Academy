<?php
namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\User;
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
            $data = $request->all();
            
            if ($request->hasFile('photo')) {
                $file = $request->file('photo');
                $filename = 'student_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                $destinationPath = public_path('uploads/admission_photos');
                if (!File::exists($destinationPath)) File::makeDirectory($destinationPath, 0777, true, true);
                $file->move($destinationPath, $filename);
                $data['photo_path'] = 'uploads/admission_photos/' . $filename;
            }

            $data['status'] = 'pending';
            $application = AdmissionApplication::create($data);

            // Admin কে ইমেইল পাঠানো
            try {
                $application->load('course');
                $adminEmail = env('MAIL_FROM_ADDRESS');
                $fallbackAdmins = User::where('role', 'super_admin')->where('is_active', true)->pluck('email')->toArray();
                $recipients = $adminEmail ? array_merge([$adminEmail], $fallbackAdmins) : $fallbackAdmins;
                $recipients = array_unique($recipients);

                $details = [
                    'name' => $application->full_name,
                    'email' => $application->email,
                    'phone' => $application->phone,
                    'course' => $application->course ? $application->course->title : 'N/A',
                    'application_id' => $application->id,
                    'date' => $application->created_at->format('d M Y, h:i A'),
                    'admin_url' => config('app.url'),
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