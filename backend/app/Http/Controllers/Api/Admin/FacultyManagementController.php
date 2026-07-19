<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Faculty;
use App\Models\FacultySubject;
use App\Models\FacultyQualification;
use App\Models\FacultyAchievement;
use App\Models\FacultyCertification;
use App\Models\FacultySocialLink;
use App\Models\FacultyGallery;
use App\Models\FacultyBatch;
use App\Models\Subject;
use App\Models\Batch;

class FacultyManagementController extends Controller
{
    /**
     * Decode JSON-encoded array fields sent via multipart FormData.
     * Frontend sends qualifications/achievements/etc. as JSON strings.
     */
    private function decodeArrayFields(Request $request, array $fields): void
    {
        foreach ($fields as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $decoded = json_decode($request->input($field), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }
    }

    public function index(Request $request)
    {
        $query = Faculty::with(['department', 'category', 'user', 'subjects']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', '%' . $request->search . '%')
                  ->orWhere('designation', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->faculty_category_id) {
            $query->where('faculty_category_id', $request->faculty_category_id);
        }

        if ($request->is_featured !== null) {
            $query->where('is_featured', $request->is_featured);
        }

        if ($request->is_active !== null) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->trashed === 'true') {
            $query->onlyTrashed();
        }

        $faculty = $query->orderBy('display_order')->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($faculty);
    }

    public function show($id)
    {
        $faculty = Faculty::with([
            'department',
            'category',
            'user',
            'subjects',
            'qualifications',
            'achievements',
            'certifications',
            'socialLinks',
            'gallery',
            'batches'
        ])->withTrashed()->findOrFail($id);

        return response()->json($faculty);
    }

    public function store(Request $request)
    {
        $this->decodeArrayFields($request, [
            'qualifications', 'achievements', 'certifications',
            'social_links', 'gallery', 'batches', 'subjects',
        ]);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'employee_id' => 'nullable|string|unique:faculty,employee_id',
            'designation' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'faculty_category_id' => 'nullable|exists:faculty_categories,id',
            'specialization' => 'nullable|string',
            'qualification' => 'nullable|string',
            'teaching_experience' => 'nullable|integer|min:0',
            'biography' => 'nullable|string|max:2000',
            'awards' => 'nullable|array',
            'achievements' => 'nullable|array',
            'certifications' => 'nullable|array',
            'publications' => 'nullable|array',
            'research' => 'nullable|string',
            'official_email' => 'nullable|email',
            'official_phone' => 'nullable|string',
            'public_profile_enabled' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:51200',
            'cover_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:51200',
            'subjects' => 'nullable|array',
            'subjects.*' => 'exists:subjects,id',
            'qualifications' => 'nullable|array',
            'achievements' => 'nullable|array',
            'certifications' => 'nullable|array',
            'social_links' => 'nullable|array',
            'gallery' => 'nullable|array',
            'batches' => 'nullable|array',
            'create_user_account' => 'boolean',
            'email' => 'nullable|required_if:create_user_account,true|email|unique:users,email',
            'password' => 'nullable|required_if:create_user_account,true|string|min:8',
        ]);

        $slug = Str::slug($validated['full_name']);
        $originalSlug = $slug;
        $counter = 1;

        while (Faculty::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter++;
        }

        $validated['slug'] = $slug;

        if ($request->hasFile('profile_photo')) {
            $path = $request->file('profile_photo')->store('faculty/profile', 'public');
            if ($path && Storage::disk('public')->exists($path)) {
                $validated['profile_photo_path'] = $path;
            }
        }

        if ($request->hasFile('cover_photo')) {
            $path = $request->file('cover_photo')->store('faculty/cover', 'public');
            if ($path && Storage::disk('public')->exists($path)) {
                $validated['cover_photo_path'] = $path;
            }
        }

        // Wrap the whole create in a transaction so a failure in any related
        // row (subjects, batches, etc.) rolls back the faculty record too.
        // Without this, a later error leaves a half-created faculty in the DB
        // (the "shows up after refresh" symptom) while the API returns 500.
        $faculty = DB::transaction(function () use ($request, $validated) {
            $faculty = Faculty::create($validated);

            // Create user account if requested
            if ($request->create_user_account && $request->email && $request->password) {
                $user = \App\Models\User::create([
                    'name' => $validated['full_name'],
                    'email' => $request->email,
                    'password' => $request->password,
                    'role' => 'teacher',
                    'is_active' => true,
                    'phone' => $validated['official_phone'] ?? null,
                    'profile_photo_path' => $validated['profile_photo_path'] ?? null,
                ]);
                $faculty->user_id = $user->id;
                $faculty->save();

                // Also create TeacherProfile so the teacher panel works
                \App\Models\TeacherProfile::create([
                    'user_id' => $user->id,
                    'designation' => $validated['designation'] ?? null,
                    'subject' => $validated['specialization'] ?? null,
                    'bio' => $validated['biography'] ?? null,
                ]);

                // Sync batch assignments from faculty batches
                if ($request->has('batches')) {
                    foreach ($request->batches as $batch) {
                        $batchId = $batch['batch_id'] ?? null;
                        if ($batchId === '' || $batchId === null) continue;
                        \App\Models\TeacherBatchAssignment::create([
                            'teacher_id' => $user->id,
                            'batch_id' => $batchId,
                            'subject' => $batch['subject'] ?? null,
                        ]);
                    }
                }
            }

            // Sync subjects
            if ($request->has('subjects')) {
                foreach ($request->subjects as $subjectId) {
                    FacultySubject::create([
                        'faculty_id' => $faculty->id,
                        'subject_id' => $subjectId,
                    ]);
                }
            }

            // Create qualifications
            if ($request->has('qualifications')) {
                foreach ($request->qualifications as $qualification) {
                    FacultyQualification::create([
                        'faculty_id' => $faculty->id,
                        'degree' => $qualification['degree'] ?? null,
                        'institution' => $qualification['institution'] ?? null,
                        'field_of_study' => $qualification['field_of_study'] ?? null,
                        'passing_year' => $qualification['passing_year'] ?? null,
                        'grade' => $qualification['grade'] ?? null,
                    ]);
                }
            }

            // Create achievements
            if ($request->has('achievements')) {
                foreach ($request->achievements as $achievement) {
                    FacultyAchievement::create([
                        'faculty_id' => $faculty->id,
                        'title' => $achievement['title'] ?? null,
                        'description' => $achievement['description'] ?? null,
                        'date' => $achievement['date'] ?? null,
                        'category' => $achievement['category'] ?? null,
                    ]);
                }
            }

            // Create certifications
            if ($request->has('certifications')) {
                foreach ($request->certifications as $certification) {
                    FacultyCertification::create([
                        'faculty_id' => $faculty->id,
                        'name' => $certification['name'] ?? null,
                        'issuing_organization' => $certification['issuing_organization'] ?? null,
                        'issue_date' => $certification['issue_date'] ?? null,
                        'expiry_date' => $certification['expiry_date'] ?? null,
                        'certificate_url' => $certification['certificate_url'] ?? null,
                    ]);
                }
            }

            // Create social links
            if ($request->has('social_links')) {
                foreach ($request->social_links as $link) {
                    FacultySocialLink::create([
                        'faculty_id' => $faculty->id,
                        'platform' => $link['platform'] ?? null,
                        'url' => $link['url'] ?? null,
                    ]);
                }
            }

            // Create gallery images
            if ($request->has('gallery')) {
                foreach ($request->gallery as $index => $image) {
                    if (isset($image['file']) && $image['file'] instanceof \Illuminate\Http\UploadedFile) {
                        $imagePath = $image['file']->store('faculty/gallery', 'public');
                        FacultyGallery::create([
                            'faculty_id' => $faculty->id,
                            'image_path' => $imagePath,
                            'caption' => $image['caption'] ?? null,
                            'display_order' => $index,
                        ]);
                    }
                }
            }

            // Assign batches — skip rows without a valid batch_id, otherwise the
            // empty value trips the batches foreign-key constraint and aborts
            // the whole create (see SQLSTATE[23000] in logs).
            if ($request->has('batches')) {
                foreach ($request->batches as $batch) {
                    $batchId = $batch['batch_id'] ?? null;
                    if ($batchId === '' || $batchId === null) {
                        continue;
                    }
                    FacultyBatch::create([
                        'faculty_id' => $faculty->id,
                        'batch_id'   => $batchId,
                        'subject'    => $batch['subject'] ?? null,
                    ]);
                }
            }

            return $faculty;
        });

        return response()->json($faculty->load(['department', 'subjects']), 201);
    }

    public function update(Request $request, $id)
    {
        $faculty = Faculty::withTrashed()->findOrFail($id);

        $this->decodeArrayFields($request, [
            'qualifications', 'achievements', 'certifications',
            'social_links', 'gallery', 'batches', 'subjects',
        ]);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'employee_id' => 'nullable|string|unique:faculty,employee_id,' . $id,
            'designation' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'faculty_category_id' => 'nullable|exists:faculty_categories,id',
            'specialization' => 'nullable|string',
            'qualification' => 'nullable|string',
            'teaching_experience' => 'nullable|integer|min:0',
            'biography' => 'nullable|string|max:2000',
            'awards' => 'nullable|array',
            'achievements' => 'nullable|array',
            'certifications' => 'nullable|array',
            'publications' => 'nullable|array',
            'research' => 'nullable|string',
            'official_email' => 'nullable|email',
            'official_phone' => 'nullable|string',
            'public_profile_enabled' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:51200',
            'cover_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:51200',
            'subjects' => 'nullable|array',
            'subjects.*' => 'exists:subjects,id',
            'qualifications' => 'nullable|array',
            'achievements' => 'nullable|array',
            'certifications' => 'nullable|array',
            'social_links' => 'nullable|array',
            'gallery' => 'nullable|array',
            'batches' => 'nullable|array',
            'email' => 'nullable|email',
            'password' => 'nullable|string|min:8',
            'create_user_account' => 'boolean',
        ]);

        if ($request->full_name !== $faculty->full_name) {
            $slug = Str::slug($validated['full_name']);
            $originalSlug = $slug;
            $counter = 1;

            while (Faculty::withTrashed()->where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = $originalSlug . '-' . $counter++;
            }

            $validated['slug'] = $slug;
        }

        if ($request->hasFile('profile_photo')) {
            if ($faculty->profile_photo_path) {
                Storage::disk('public')->delete($faculty->profile_photo_path);
            }
            $path = $request->file('profile_photo')->store('faculty/profile', 'public');
            if ($path && Storage::disk('public')->exists($path)) {
                $validated['profile_photo_path'] = $path;
            }
        }

        if ($request->hasFile('cover_photo')) {
            if ($faculty->cover_photo_path) {
                Storage::disk('public')->delete($faculty->cover_photo_path);
            }
            $path = $request->file('cover_photo')->store('faculty/cover', 'public');
            if ($path && Storage::disk('public')->exists($path)) {
                $validated['cover_photo_path'] = $path;
            }
        }

        DB::transaction(function () use ($request, $faculty, $validated, $id) {
            $faculty->update($validated);

        // Handle user account updates
        if ($request->create_user_account && $request->email && $request->password) {
            // Create new user account if faculty doesn't have one
            if (!$faculty->user) {
                $user = \App\Models\User::create([
                    'name' => $validated['full_name'],
                    'email' => $request->email,
                    'password' => $request->password,
                    'role' => 'teacher',
                    'is_active' => true,
                    'phone' => $validated['official_phone'] ?? null,
                    'profile_photo_path' => $validated['profile_photo_path'] ?? $faculty->profile_photo_path,
                ]);
                $faculty->user_id = $user->id;
                $faculty->save();

                // Also create TeacherProfile so the teacher panel works
                \App\Models\TeacherProfile::create([
                    'user_id' => $user->id,
                    'designation' => $validated['designation'] ?? null,
                    'subject' => $validated['specialization'] ?? null,
                    'bio' => $validated['biography'] ?? null,
                ]);

                // Sync batch assignments from faculty batches
                $batches = $request->input('batches', []);
                foreach ($batches as $batch) {
                    $batchId = $batch['batch_id'] ?? null;
                    if ($batchId === '' || $batchId === null) continue;
                    \App\Models\TeacherBatchAssignment::create([
                        'teacher_id' => $user->id,
                        'batch_id' => $batchId,
                        'subject' => $batch['subject'] ?? null,
                    ]);
                }
            }
        } elseif ($faculty->user) {
            // Update existing user account
            $userUpdate = [];
            if ($request->filled('email')) {
                $userUpdate['email'] = $request->email;
            }
            if ($request->filled('password')) {
                $userUpdate['password'] = $request->password;
            }
            if ($validated['profile_photo_path'] ?? null) {
                $userUpdate['profile_photo_path'] = $validated['profile_photo_path'];
            }
            if (!empty($userUpdate)) {
                $faculty->user->update($userUpdate);
            }
            // Update TeacherProfile if exists
            $teacherProfile = $faculty->user->teacher_profile;
            if ($teacherProfile) {
                $teacherProfile->update([
                    'designation' => $validated['designation'] ?? $teacherProfile->designation,
                    'subject' => $validated['specialization'] ?? $teacherProfile->subject,
                    'bio' => $validated['biography'] ?? $teacherProfile->bio,
                ]);
            }
        }

        // Sync subjects
        FacultySubject::where('faculty_id', $faculty->id)->delete();
        if ($request->has('subjects')) {
            foreach ($request->subjects as $subjectId) {
                FacultySubject::create([
                    'faculty_id' => $faculty->id,
                    'subject_id' => $subjectId,
                ]);
            }
        }

        // Update qualifications
        FacultyQualification::where('faculty_id', $faculty->id)->delete();
        if ($request->has('qualifications')) {
            foreach ($request->qualifications as $qualification) {
                FacultyQualification::create([
                    'faculty_id' => $faculty->id,
                    'degree' => $qualification['degree'] ?? null,
                    'institution' => $qualification['institution'] ?? null,
                    'field_of_study' => $qualification['field_of_study'] ?? null,
                    'passing_year' => $qualification['passing_year'] ?? null,
                    'grade' => $qualification['grade'] ?? null,
                ]);
            }
        }

        // Update achievements
        FacultyAchievement::where('faculty_id', $faculty->id)->delete();
        if ($request->has('achievements')) {
            foreach ($request->achievements as $achievement) {
                FacultyAchievement::create([
                    'faculty_id' => $faculty->id,
                    'title' => $achievement['title'] ?? null,
                    'description' => $achievement['description'] ?? null,
                    'date' => $achievement['date'] ?? null,
                    'category' => $achievement['category'] ?? null,
                ]);
            }
        }

        // Update certifications
        FacultyCertification::where('faculty_id', $faculty->id)->delete();
        if ($request->has('certifications')) {
            foreach ($request->certifications as $certification) {
                FacultyCertification::create([
                    'faculty_id' => $faculty->id,
                    'name' => $certification['name'] ?? null,
                    'issuing_organization' => $certification['issuing_organization'] ?? null,
                    'issue_date' => $certification['issue_date'] ?? null,
                    'expiry_date' => $certification['expiry_date'] ?? null,
                    'certificate_url' => $certification['certificate_url'] ?? null,
                ]);
            }
        }

        // Update social links
        FacultySocialLink::where('faculty_id', $faculty->id)->delete();
        if ($request->has('social_links')) {
            foreach ($request->social_links as $link) {
                FacultySocialLink::create([
                    'faculty_id' => $faculty->id,
                    'platform' => $link['platform'] ?? null,
                    'url' => $link['url'] ?? null,
                ]);
            }
        }

        // Update gallery
        FacultyGallery::where('faculty_id', $faculty->id)->delete();
        if ($request->has('gallery')) {
            foreach ($request->gallery as $index => $image) {
                if (isset($image['file']) && $image['file'] instanceof \Illuminate\Http\UploadedFile) {
                    $imagePath = $image['file']->store('faculty/gallery', 'public');
                    FacultyGallery::create([
                        'faculty_id' => $faculty->id,
                        'image_path' => $imagePath,
                        'caption' => $image['caption'] ?? null,
                        'display_order' => $index,
                    ]);
                }
            }
        }

        // Update batches — skip rows without a valid batch_id, otherwise the
        // empty value trips the batches foreign-key constraint (SQLSTATE[23000]).
        FacultyBatch::where('faculty_id', $faculty->id)->delete();
        if ($request->has('batches')) {
            foreach ($request->batches as $batch) {
                $batchId = $batch['batch_id'] ?? null;
                if ($batchId === '' || $batchId === null) {
                    continue;
                }
                FacultyBatch::create([
                    'faculty_id' => $faculty->id,
                    'batch_id' => $batchId,
                    'subject' => $batch['subject'] ?? null,
                ]);
            }
        }
        });

        return response()->json($faculty->load(['department', 'subjects']));
    }

    public function destroy($id)
    {
        $faculty = Faculty::findOrFail($id);
        
        $faculty->delete();
        
        return response()->json(['message' => 'Faculty deleted successfully']);
    }

    public function restore($id)
    {
        $faculty = Faculty::withTrashed()->findOrFail($id);
        
        $faculty->restore();
        
        return response()->json(['message' => 'Faculty restored successfully']);
    }

    public function forceDelete($id)
    {
        $faculty = Faculty::withTrashed()->findOrFail($id);
        
        // Delete associated files
        if ($faculty->profile_photo_path) {
            Storage::disk('public')->delete($faculty->profile_photo_path);
        }
        if ($faculty->cover_photo_path) {
            Storage::disk('public')->delete($faculty->cover_photo_path);
        }
        
        foreach ($faculty->gallery as $image) {
            Storage::disk('public')->delete($image->image_path);
        }
        
        $faculty->forceDelete();
        
        return response()->json(['message' => 'Faculty permanently deleted']);
    }

    public function toggleFeatured($id)
    {
        $faculty = Faculty::findOrFail($id);
        $faculty->is_featured = !$faculty->is_featured;
        $faculty->save();
        
        return response()->json(['message' => 'Featured status updated', 'is_featured' => $faculty->is_featured]);
    }

    public function toggleActive($id)
    {
        $faculty = Faculty::findOrFail($id);
        $faculty->is_active = !$faculty->is_active;
        $faculty->save();
        
        return response()->json(['message' => 'Active status updated', 'is_active' => $faculty->is_active]);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'faculty_ids' => 'required|array',
            'faculty_ids.*' => 'exists:faculty,id',
        ]);

        foreach ($validated['faculty_ids'] as $index => $id) {
            Faculty::where('id', $id)->update(['display_order' => $index]);
        }

        return response()->json(['message' => 'Faculty reordered successfully']);
    }

    public function getDepartments()
    {
        $departments = \App\Models\Department::where('is_active', true)->orderBy('display_order')->get();
        return response()->json($departments);
    }

    public function getSubjects()
    {
        $subjects = Subject::where('is_active', true)->orderBy('display_order')->get();
        return response()->json($subjects);
    }

    public function getBatches()
    {
        $batches = Batch::with('course')->get();
        return response()->json($batches);
    }

    // ===================== Faculty Category CRUD =====================

    public function getCategories()
    {
        $categories = \App\Models\FacultyCategory::orderBy('display_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($categories);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $originalSlug = $validated['slug'];
        $counter = 1;
        while (\App\Models\FacultyCategory::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = $originalSlug . '-' . $counter++;
        }

        $category = \App\Models\FacultyCategory::create($validated);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = \App\Models\FacultyCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $validated['slug'] = Str::slug($validated['name']);
            $originalSlug = $validated['slug'];
            $counter = 1;
            while (\App\Models\FacultyCategory::where('slug', $validated['slug'])->where('id', '!=', $id)->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter++;
            }
        }

        $category->update($validated);

        return response()->json($category);
    }

    public function destroyCategory($id)
    {
        $category = \App\Models\FacultyCategory::findOrFail($id);

        // Detach category from any faculty before deleting
        \App\Models\Faculty::where('faculty_category_id', $id)->update(['faculty_category_id' => null]);

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }
}
