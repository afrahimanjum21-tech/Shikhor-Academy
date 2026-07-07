<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'designation',
        'subject',
        'bio',
        'joining_date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}