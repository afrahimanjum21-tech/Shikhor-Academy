<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'date',
        'session',
        'status',
        'punch_in_at',
        'punch_out_at',
        'leave_status',
        'leave_reason',
        'leave_requested_at',
        'leave_approved_at',
        'leave_approved_by',
    ];

    protected $casts = [
        'leave_requested_at' => 'datetime',
        'leave_approved_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'leave_approved_by');
    }
}
