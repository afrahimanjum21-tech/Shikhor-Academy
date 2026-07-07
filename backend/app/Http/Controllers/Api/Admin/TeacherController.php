<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TeacherProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class TeacherController extends Controller
{
    public function index()
    {
        // টিচার এবং তাদের প্রোফাইল একসাথে আনা হচ্ছে
        return User::where('role', 'teacher')->with('teacher_profile')->latest()->get();
    }

    public function store(Request $request)
    {
        // ১. ভ্যালিডেশন
        $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users,email', // চেক করবে ইমেইলটি ইউনিক কিনা
            'phone' => 'required',
            'designation' => 'required',
            'subject' => 'required',
        ]);

        try {
            DB::transaction(function () use ($request) {
                // ২. ইউজার তৈরি
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make('password123'),
                    'role' => 'teacher',
                    'phone' => $request->phone,
                    'is_active' => true
                ]);

                // ৩. টিচার প্রোফাইল তৈরি (এটি আগে মিসিং ছিল বা সমস্যা করছিল)
                TeacherProfile::create([
                    'user_id' => $user->id,
                    'designation' => $request->designation,
                    'subject' => $request->subject,
                    'joining_date' => now()
                ]);
            });

            return response()->json(['message' => 'Teacher added successfully']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'Teacher deleted']);
    }
}