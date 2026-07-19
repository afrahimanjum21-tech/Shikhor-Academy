<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return User::where('role', 'student')
            ->with('student_profile', 'student_profile.batch', 'student_profile.batch.course')
            ->latest()
            ->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'dob' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female,other',
            'religion' => 'nullable|string|max:50',
            'blood_group' => 'nullable|string|max:10',
            'nationality' => 'nullable|string|max:50',

            'father_name' => 'nullable|string|max:255',
            'father_mobile' => 'nullable|string|max:20',
            'father_occupation' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'mother_mobile' => 'nullable|string|max:20',
            'mother_occupation' => 'nullable|string|max:255',

            'present_address' => 'nullable|string',
            'permanent_address' => 'nullable|string',

            'emergency_name' => 'nullable|string|max:255',
            'emergency_mobile' => 'nullable|string|max:20',

            'last_school' => 'nullable|string|max:255',
            'jsc_gpa' => 'nullable|string|max:10',
            'ssc_gpa' => 'nullable|string|max:10',

            'student_id_card_no' => 'nullable|string|unique:students,student_id_card_no',
            'current_batch_id' => 'nullable|exists:batches,id',
            'guardian_phone' => 'nullable|string|max:20',

            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:51200',
        ]);

        $user = DB::transaction(function () use ($request, $validated) {
            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('photo')) {
                $file = $request->file('photo');
                $filename = 'student_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                $destinationPath = public_path('uploads/admission_photos');
                if (!File::exists($destinationPath)) {
                    File::makeDirectory($destinationPath, 0755, true, true);
                }
                $file->move($destinationPath, $filename);
                $photoPath = 'uploads/admission_photos/' . $filename;
            }

            $email = $validated['email'] ?? ('student_' . Str::random(8) . '@uttoron.edu.bd');
            $password = $validated['password'] ?? Str::random(10);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => $password,
                'phone' => $validated['phone'] ?? null,
                'role' => 'student',
                'is_active' => true,
                'profile_photo_path' => $photoPath,
            ]);

            $user->student_profile()->create([
                'student_id_card_no' => $validated['student_id_card_no'] ?? null,
                'current_batch_id' => $validated['current_batch_id'] ?? null,
                'guardian_phone' => $validated['guardian_phone'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'blood_group' => $validated['blood_group'] ?? null,
                'religion' => $validated['religion'] ?? null,
                'dob' => $validated['dob'] ?? null,
                'nationality' => $validated['nationality'] ?? null,
                'present_address' => $validated['present_address'] ?? null,
                'permanent_address' => $validated['permanent_address'] ?? null,
                'father_name' => $validated['father_name'] ?? null,
                'father_mobile' => $validated['father_mobile'] ?? null,
                'father_occupation' => $validated['father_occupation'] ?? null,
                'mother_name' => $validated['mother_name'] ?? null,
                'mother_mobile' => $validated['mother_mobile'] ?? null,
                'mother_occupation' => $validated['mother_occupation'] ?? null,
                'emergency_name' => $validated['emergency_name'] ?? null,
                'emergency_mobile' => $validated['emergency_mobile'] ?? null,
                'last_school' => $validated['last_school'] ?? null,
                'ssc_gpa' => $validated['ssc_gpa'] ?? null,
                'jsc_gpa' => $validated['jsc_gpa'] ?? null,
            ]);

            return $user;
        });

        return response()->json($user->load('student_profile.batch.course'), 201);
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
                    $user->update(['password' => $request->password]);
                }

                if ($request->hasFile('photo')) {
                    $file = $request->file('photo');
                    $filename = 'student_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                    $destinationPath = public_path('uploads/admission_photos');
                    if (!File::exists($destinationPath)) {
                        File::makeDirectory($destinationPath, 0755, true, true);
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
                        'shift'              => $request->input('shift', $prof->shift),
                        'section'            => $request->input('section', $prof->section),
                        'group_name'         => $request->input('group_name', $prof->group_name),
                        'subject'            => $request->input('subject', $prof->subject),
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