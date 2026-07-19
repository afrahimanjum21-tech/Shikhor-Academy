<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyAchievement extends Model
{
    protected $table = 'faculty_achievements';

    protected $fillable = [
        'faculty_id',
        'title',
        'description',
        'date',
        'category',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }
}
