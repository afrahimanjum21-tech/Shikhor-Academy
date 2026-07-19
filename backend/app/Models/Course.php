<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'category',
        'category_id',
        'fee',
        'discount_price',
        'thumbnail',
        'features',
        'duration',
        'seats',
        'teacher_name',
        'class_mode',
        'sorting_order',
        'is_featured',
        'is_active'
    ];

    protected $casts = [
        'features' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function courseCategory()
    {
        return $this->belongsTo(CourseCategory::class, 'category_id');
    }

    public function batches()
    {
        return $this->hasMany(Batch::class);
    }
}
