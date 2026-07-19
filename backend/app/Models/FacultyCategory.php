<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function faculty()
    {
        return $this->hasMany(Faculty::class, 'faculty_category_id');
    }
}
