<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultySocialLink extends Model
{
    protected $table = 'faculty_social_links';

    protected $fillable = [
        'faculty_id',
        'platform',
        'url',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }
}
