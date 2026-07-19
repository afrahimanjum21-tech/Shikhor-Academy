<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ElearningVideo extends Model
{
    use HasFactory;

    protected $table = 'elearning_videos';

    protected $fillable = [
        'title',
        'description',
        'teacher',
        'duration',
        'video_url',
        'platform',
        'video_id',
        'thumbnail_path',
        'is_locked',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'is_active' => 'boolean',
    ];
}
