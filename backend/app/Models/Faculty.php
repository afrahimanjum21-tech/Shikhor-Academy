<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faculty extends Model
{
    use SoftDeletes;

    protected $table = 'faculty';

    protected $fillable = [
        'full_name',
        'employee_id',
        'profile_photo_path',
        'cover_photo_path',
        'gender',
        'date_of_birth',
        'designation',
        'department_id',
        'faculty_category_id',
        'specialization',
        'qualification',
        'teaching_experience',
        'biography',
        'awards',
        'achievements',
        'certifications',
        'publications',
        'research',
        'official_email',
        'official_phone',
        'public_profile_enabled',
        'is_featured',
        'is_active',
        'display_order',
        'slug',
        'meta_title',
        'meta_description',
        'og_image',
        'user_id',
    ];

    protected $casts = [
        'awards' => 'array',
        'achievements' => 'array',
        'certifications' => 'array',
        'publications' => 'array',
        'public_profile_enabled' => 'boolean',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'date_of_birth' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function category()
    {
        return $this->belongsTo(FacultyCategory::class, 'faculty_category_id');
    }

    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'faculty_subjects');
    }

    public function qualifications()
    {
        return $this->hasMany(FacultyQualification::class);
    }

    public function achievements()
    {
        return $this->hasMany(FacultyAchievement::class);
    }

    public function certifications()
    {
        return $this->hasMany(FacultyCertification::class);
    }

    public function socialLinks()
    {
        return $this->hasMany(FacultySocialLink::class);
    }

    public function gallery()
    {
        return $this->hasMany(FacultyGallery::class);
    }

    public function batches()
    {
        return $this->belongsToMany(Batch::class, 'faculty_batches')->withPivot('subject');
    }
}
