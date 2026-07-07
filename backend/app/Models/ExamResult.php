<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamResult extends Model
{
    use HasFactory;
    protected $fillable = ['exam_id', 'student_id', 'marks_details', 'total_obtained', 'grade', 'gpa'];

    protected $casts = [
        'marks_details' => 'array',
    ];

    public function exam() {
        return $this->belongsTo(Exam::class);
    }

    public function student() {
        return $this->belongsTo(Student::class);
    }
}
