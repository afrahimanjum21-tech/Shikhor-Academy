<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    public function index()
    {
        return User::where('role', 'student')
                   ->with(['student_profile.batch.course', 'student_profile.admission.course'])
                   ->latest()
                   ->get();
    }

    // 🔥 ফিক্স: সিঙ্গেল স্টুডেন্ট দেখার সময় 'admission.course' লোড করা
    public function show($id)
    {
        return User::with(['student_profile.batch.course', 'student_profile.admission.course'])
                   ->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        try {
            DB::transaction(function () use ($user, $request) {
                
                $user->update([
                    'name' => $request->input('name', $user->name),
                    'email' => $request->input('email', $user->email),
                    'phone' => $request->input('phone', $user->phone),
                ]);

                if ($request->filled('password')) {
                    $user->update(['password' => Hash::make($request->password)]);
                }

                if ($request->hasFile('photo')) {
                    $file = $request->file('photo');
                    $filename = 'student_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                    $destinationPath = public_path('uploads/admission_photos');
                    if (!File::exists($destinationPath)) {
                        File::makeDirectory($destinationPath, 0777, true, true);
                    }

                    $file->move($destinationPath, $filename);
                    $relativePath = 'uploads/admission_photos/' . $filename;

                    // পুরোনো ছবি মুছে ফেলা (user টেবিল বা admission যেখানেই থাকুক)
                    $oldUserPhoto = $user->profile_photo_path;
                    if ($oldUserPhoto && File::exists(public_path($oldUserPhoto))) {
                        File::delete(public_path($oldUserPhoto));
                    }

                    // 🔥 ফিক্স: ছবি সবসময় users.profile_photo_path-এ সেভ হবে
                    // যাতে admission record না থাকলেও ছবি দেখায় (layout, profile, admin list — সবখানে)
                    $user->update(['profile_photo_path' => $relativePath]);

                    // admission record থাকলে সেখানেও সিঙ্ক করা (পুরোনো কোডের সাথে সামঞ্জস্য)
                    if ($user->student_profile && $user->student_profile->admission) {
                        $oldAdmissionPhoto = $user->student_profile->admission->photo_path;
                        if ($oldAdmissionPhoto && $oldAdmissionPhoto !== $oldUserPhoto && File::exists(public_path($oldAdmissionPhoto))) {
                            File::delete(public_path($oldAdmissionPhoto));
                        }
                        $user->student_profile->admission->update(['photo_path' => $relativePath]);
                    }
                }

                if ($user->student_profile) {
                    $prof = $user->student_profile;
                    
                    $user->student_profile->update([
                        'student_id_card_no' => $request->input('student_id_card_no', $prof->student_id_card_no),
                        'current_batch_id'   => $request->filled('current_batch_id') ? $request->current_batch_id : $prof->current_batch_id,
                        'guardian_phone'     => $request->input('guardian_phone', $prof->guardian_phone),
                        
                        'father_name'        => $request->input('father_name', $prof->father_name),
                        'father_mobile'      => $request->input('father_mobile', $prof->father_mobile),
                        'father_occupation'  => $request->input('father_occupation', $prof->father_occupation),
                        'mother_name'        => $request->input('mother_name', $prof->mother_name),
                        'mother_mobile'      => $request->input('mother_mobile', $prof->mother_mobile),
                        'mother_occupation'  => $request->input('mother_occupation', $prof->mother_occupation),
                        
                        'gender'             => $request->input('gender', $prof->gender),
                        'blood_group'        => $request->input('blood_group', $prof->blood_group),
                        'religion'           => $request->input('religion', $prof->religion),
                        'dob'                => $request->input('dob', $prof->dob),
                        'nationality'        => $request->input('nationality', $prof->nationality),
                        
                        'present_address'    => $request->input('present_address', $prof->present_address),
                        'permanent_address'  => $request->input('permanent_address', $prof->permanent_address),
                        
                        'last_school'        => $request->input('last_school', $prof->last_school),
                        'ssc_gpa'            => $request->input('ssc_gpa', $prof->ssc_gpa),
                        'jsc_gpa'            => $request->input('jsc_gpa', $prof->jsc_gpa),
                    ]);
                }
            });

            return response()->json(['message' => 'Updated successfully']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Update failed: ' . $e->getMessage()], 500);
        }
    }

    public function action($action, $id) { /* ... Action Logic same as before ... */ 
        $user = User::findOrFail($id);
        if ($action === 'delete') { $user->delete(); return response()->json(['message' => 'Deleted']); }
        if ($action === 'ban') { $user->update(['is_active' => false]); return response()->json(['message' => 'Banned']); }
        if ($action === 'activate') { $user->update(['is_active' => true]); return response()->json(['message' => 'Activated']); }
        return response()->json(['message' => 'Invalid action'], 400);
    }
}