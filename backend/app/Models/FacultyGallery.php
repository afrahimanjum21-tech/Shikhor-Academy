<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyGallery extends Model
{
    protected $table = 'faculty_gallery';

    protected $fillable = [
        'faculty_id',
        'image_path',
        'caption',
        'display_order',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }
}
