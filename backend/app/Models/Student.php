<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    // 🔥 ফিক্স: সব নতুন কলাম এখানে যোগ করা হয়েছে
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
        'last_school', 'jsc_gpa', 'ssc_gpa'
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function batch() { return $this->belongsTo(Batch::class, 'current_batch_id'); }
    public function admission() { return $this->belongsTo(AdmissionApplication::class, 'admission_id'); }
    public function exam_results() { return $this->hasMany(ExamResult::class); }
}