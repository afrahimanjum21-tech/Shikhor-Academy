<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyBatch extends Model
{
    protected $table = 'faculty_batches';

    protected $fillable = [
        'faculty_id',
        'batch_id',
        'subject',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }
}
