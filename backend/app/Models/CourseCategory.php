<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'icon',
        'color',
        'display_order',
        'is_visible',
        'is_active'
    ];

    public function courses()
    {
        return $this->hasMany(Course::class, 'category_id');
    }

    public function scopeVisible($query)
    {
        return $query->where('is_visible', true)->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }
}
