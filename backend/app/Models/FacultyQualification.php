<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyQualification extends Model
{
    protected $table = 'faculty_qualifications';

    protected $fillable = [
        'faculty_id',
        'degree',
        'institution',
        'field_of_study',
        'passing_year',
        'grade',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }
}
