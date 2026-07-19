<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyCertification extends Model
{
    protected $table = 'faculty_certifications';

    protected $fillable = [
        'faculty_id',
        'name',
        'issuing_organization',
        'issue_date',
        'expiry_date',
        'certificate_url',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }
}
