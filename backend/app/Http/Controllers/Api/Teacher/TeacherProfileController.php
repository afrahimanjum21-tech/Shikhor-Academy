<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\TeacherProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class TeacherProfileController extends Controller
{
    public function show(Request $request)
    {
        $teacher = $request->user()->load('teacher_profile');
        return response()->json($teacher);
    }

    public function update(Request $request)
    {
        $teacher = $request->user();
        $teacherProfile = $teacher->teacher_profile;

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'bio' => 'sometimes|string|max:1000',
        ]);

        // Update user basic info
        if (isset($validated['name'])) {
            $teacher->name = $validated['name'];
        }
        if (isset($validated['phone'])) {
            $teacher->phone = $validated['phone'];
        }
        $teacher->save();

        // Update teacher profile
        if ($teacherProfile) {
            if (isset($validated['bio'])) {
                $teacherProfile->bio = $validated['bio'];
            }
            $teacherProfile->save();
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $teacher->load('teacher_profile')
        ]);
    }

    public function updatePhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:51200',
        ]);

        $teacher = $request->user();

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('teacher_photos', 'public');
            $teacher->profile_photo_path = $path;
            $teacher->save();
        }

        return response()->json([
            'message' => 'Photo updated successfully',
            'user' => $teacher->load('teacher_profile')
        ]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed',
        ]);

        $teacher = $request->user();

        if (!Hash::check($validated['current_password'], $teacher->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $teacher->password = $validated['new_password'];
        $teacher->save();

        return response()->json(['message' => 'Password changed successfully']);
    }
}
