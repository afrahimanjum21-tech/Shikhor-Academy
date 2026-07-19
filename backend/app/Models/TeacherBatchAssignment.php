<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherBatchAssignment extends Model
{
    protected $fillable = ['teacher_id', 'batch_id', 'subject'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }
}
