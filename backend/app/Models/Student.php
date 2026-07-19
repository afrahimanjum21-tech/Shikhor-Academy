<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'student_id_card_no', 'admission_id', 'current_batch_id', 
        'guardian_phone', 'admission_date',
        
        // Personal
        'gender', 'nationality', 'religion', 'blood_group', 'dob',
        
        // Guardian
        'father_name', 'father_mobile', 'father_occupation',
        'mother_name', 'mother_mobile', 'mother_occupation',
        
        // Address
        'present_address', 'permanent_address',
        
        // Emergency & Academic
        'emergency_name', 'emergency_mobile',
        'last_school', 'jsc_gpa', 'ssc_gpa',

        // Batch meta
        'shift', 'section', 'group_name', 'subject',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function batch() { return $this->belongsTo(Batch::class, 'current_batch_id'); }
    public function admission() { return $this->belongsTo(AdmissionApplication::class, 'admission_id'); }
    public function exam_results() { return $this->hasMany(ExamResult::class); }
    public function assignmentSubmissions() { return $this->hasMany(AssignmentSubmission::class); }
    public function documents() { return $this->hasMany(StudentDocument::class, 'student_id'); }
}