<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account is inactive.'], 403);
        }

        $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

        // 🔥 ফিক্স: লগইনের সময় 'admission' রিলেশনটি লোড করা হচ্ছে (ছবির জন্য)
        $user->load([
            'student_profile.admission.course', // <--- ছবি + কোর্স আনবে
            'student_profile.batch.course', 
            'teacher_profile'
        ]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        // ইউজার চেক করার সময়ও সব ডাটা লোড করা
        $user = $request->user();
        $user->load([
            'student_profile.admission.course',
            'student_profile.batch.course',
            'teacher_profile'
        ]);
        return response()->json($user);
    }
}