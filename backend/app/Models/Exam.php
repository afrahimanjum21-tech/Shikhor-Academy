<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'course_id', 'subjects', 'subject_marks', 'total_marks', 'date', 'type', 'is_published'];

    protected $casts = [
        'subjects'      => 'array',
        'subject_marks' => 'array',
        'is_published'  => 'boolean',
    ];

    public function course() {
        return $this->belongsTo(Course::class);
    }

    public function results() {
        return $this->hasMany(ExamResult::class);
    }
}
