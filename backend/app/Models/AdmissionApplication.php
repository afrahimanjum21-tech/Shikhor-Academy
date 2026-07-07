<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'full_name', 'father_name', 'mother_name', 'phone', 'email', 'dob', 'address', 'course_id', 'photo_path', 'status',
        'gender', 'nationality', 'religion', 'blood_group',
        'father_mobile', 'father_email', 'father_occupation',
        'mother_mobile', 'mother_email', 'mother_occupation',
        'permanent_address',
        'emergency_name', 'emergency_mobile', 'emergency_relation',
        'last_school', 'jsc_gpa', 'ssc_gpa'
    ];

    public function course() { return $this->belongsTo(Course::class); }
}