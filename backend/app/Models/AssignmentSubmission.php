<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssignmentSubmission extends Model
{
    protected $fillable = ['assignment_id', 'student_id', 'submission_file_path', 'submission_text', 'marks_obtained', 'feedback', 'status', 'submitted_at'];

    protected $casts = [
        'marks_obtained' => 'decimal:2',
        'submitted_at' => 'datetime'
    ];

    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
