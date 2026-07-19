<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TeacherProfile;
use App\Models\TeacherBatchAssignment;
use App\Models\Faculty;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return User::where('role', 'teacher')
            ->with('teacher_profile', 'teacher_profile.designation')
            ->latest()
            ->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|email|unique:users,email',
            'phone'       => 'required|string|max:20',
            'designation' => 'required|string|max:255',
            'subject'     => 'required|string|max:255',
            'password'    => 'required|string|min:8',
            'bio'         => 'nullable|string',
            'joining_date'=> 'nullable|date',
            'batch_assignments' => 'nullable|array',
            'batch_assignments.*.batch_id' => 'required|exists:batches,id',
            'batch_assignments.*.subject'  => 'required|string|max:255',
        ]);

        try {
            $user = null;
            DB::transaction(function () use ($validated, $request, &$user) {
                $user = User::create([
                    'name'       => $validated['name'],
                    'email'      => $validated['email'],
                    'password'   => $validated['password'],
                    'role'       => 'teacher',
                    'phone'      => $validated['phone'],
                    'is_active'  => true,
                ]);

                TeacherProfile::create([
                    'user_id'      => $user->id,
                    'designation'  => $validated['designation'],
                    'subject'      => $validated['subject'],
                    'bio'          => $validated['bio'] ?? null,
                    'joining_date' => $validated['joining_date'] ?? now(),
                ]);

                // Create batch assignments
                if (!empty($validated['batch_assignments'])) {
                    $assignments = [];
                    foreach ($validated['batch_assignments'] as $ba) {
                        $assignments[] = [
                            'teacher_id' => $user->id,
                            'batch_id'   => $ba['batch_id'],
                            'subject'    => $ba['subject'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    TeacherBatchAssignment::insert($assignments);
                }

                // Auto-create faculty showcase entry
                $slug = Str::slug($validated['name']);
                $originalSlug = $slug;
                $counter = 1;
                while (Faculty::where('slug', $slug)->exists()) {
                    $slug = $originalSlug . '-' . $counter++;
                }

                Faculty::create([
                    'full_name'             => $validated['name'],
                    'designation'           => $validated['designation'],
                    'specialization'       => $validated['subject'],
                    'slug'                  => $slug,
                    'user_id'               => $user->id,
                    'official_email'        => $validated['email'],
                    'public_profile_enabled' => true,
                    'is_active'             => true,
                    'is_featured'           => false,
                    'display_order'         => 0,
                ]);
            });

            return response()->json([
                'message' => 'Teacher added successfully',
                'user_id' => $user?->id,
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $teacher = User::where('role', 'teacher')->findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'email'       => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($teacher->id)],
            'phone'       => 'sometimes|string|max:20',
            'designation' => 'sometimes|string|max:255',
            'subject'     => 'sometimes|string|max:255',
            'password'    => 'sometimes|nullable|string|min:8',
            'is_active'   => 'sometimes|boolean',
            'bio'         => 'nullable|string',
            'joining_date'=> 'nullable|date',
            'batch_assignments' => 'nullable|array',
            'batch_assignments.*.batch_id' => 'required|exists:batches,id',
            'batch_assignments.*.subject'  => 'required|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($validated, $teacher) {
                $userUpdate = [];
                if (isset($validated['name']))  $userUpdate['name']  = $validated['name'];
                if (isset($validated['email'])) $userUpdate['email'] = $validated['email'];
                if (isset($validated['phone'])) $userUpdate['phone'] = $validated['phone'];
                if (isset($validated['is_active'])) $userUpdate['is_active'] = $validated['is_active'];

                if (!empty($validated['password'])) {
                    $userUpdate['password'] = $validated['password'];
                }

                if (!empty($userUpdate)) {
                    $teacher->update($userUpdate);
                }

                // Sync teacher profile fields
                $profileData = [];
                if (isset($validated['designation'])) $profileData['designation'] = $validated['designation'];
                if (isset($validated['subject']))     $profileData['subject']     = $validated['subject'];
                if (array_key_exists('bio', $validated))          $profileData['bio']          = $validated['bio'];
                if (array_key_exists('joining_date', $validated)) $profileData['joining_date'] = $validated['joining_date'];

                if (!empty($profileData)) {
                    $teacher->teacher_profile()
                        ->updateOrCreate(['user_id' => $teacher->id], $profileData);
                }

                // Sync batch assignments
                if (isset($validated['batch_assignments'])) {
                    $teacher->batchAssignments()->delete();
                    $assignments = [];
                    foreach ($validated['batch_assignments'] as $ba) {
                        $assignments[] = [
                            'teacher_id' => $teacher->id,
                            'batch_id'   => $ba['batch_id'],
                            'subject'    => $ba['subject'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    if (!empty($assignments)) {
                        TeacherBatchAssignment::insert($assignments);
                    }
                }
            });

            return response()->json(['message' => 'Teacher updated successfully']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function updatePhoto(Request $request, $id)
    {
        $teacher = User::where('role', 'teacher')->findOrFail($id);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:51200',
        ]);

        // Delete old photo if exists
        if ($teacher->profile_photo_path) {
            Storage::disk('public')->delete($teacher->profile_photo_path);
        }

        $path = $request->file('photo')->store('teacher_photos', 'public');
        $teacher->profile_photo_path = $path;
        $teacher->save();

        // Sync photo to the Faculty record so it shows on the public Faculty page.
        // Creates a record if none exists (handles teachers missing a faculty row).
        $faculty = Faculty::withTrashed()->where('user_id', $teacher->id)->first();
        if ($faculty) {
            $faculty->profile_photo_path = $path;
            $faculty->save();
        } else {
            Faculty::create([
                'user_id'                => $teacher->id,
                'full_name'              => $teacher->name,
                'designation'            => $teacher->teacher_profile?->designation ?? 'Teacher',
                'specialization'         => $teacher->teacher_profile?->subject,
                'slug'                   => Str::slug($teacher->name) . '-' . $teacher->id,
                'official_email'         => $teacher->email,
                'profile_photo_path'     => $path,
                'public_profile_enabled' => true,
                'is_active'              => true,
                'is_featured'            => false,
                'display_order'          => 0,
            ]);
        }

        return response()->json([
            'message' => 'Photo updated successfully',
            'user' => $teacher->fresh()->load('teacher_profile'),
        ]);
    }

    public function destroy($id)
    {
        $teacher = User::where('role', 'teacher')->findOrFail($id);
        $teacher->delete();
        return response()->json(['message' => 'Teacher deleted']);
    }
}
