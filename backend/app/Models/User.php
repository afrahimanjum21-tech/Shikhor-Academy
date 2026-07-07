<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = [
        'profile_photo_url',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'is_active',
        'profile_photo_path', // <--- এই লাইনটি খুব জরুরি
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function student_profile()
    {
        return $this->hasOne(Student::class);
    }

    public function teacher_profile()
    {
        return $this->hasOne(TeacherProfile::class);
    }

    public function getProfilePhotoUrlAttribute()
    {
        $path = $this->profile_photo_path;

        if (!$path && $this->relationLoaded('student_profile') && $this->student_profile) {
            $admission = $this->student_profile->relationLoaded('admission')
                ? $this->student_profile->admission
                : null;
            $path = $admission?->photo_path;
        }

        if (!$path) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', $path), '/');
        $path = preg_replace('#^(public/|storage/)#', '', $path);

        return url($path);
    }
}
