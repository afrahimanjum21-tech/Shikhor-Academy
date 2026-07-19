<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    protected $fillable = ['teacher_id', 'batch_id', 'title', 'description', 'subject', 'due_date', 'attachment_path', 'total_marks'];

    protected $casts = [
        'due_date' => 'date',
        'total_marks' => 'integer'
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function submissions()
    {
        return $this->hasMany(AssignmentSubmission::class);
    }
}
