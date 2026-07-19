<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Routine extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id', 'day', 'subject', 'teacher_name', 'start_time', 'end_time',
        'time_slot', 'teacher', 'room', 'lab', 'notes',
        'status', 'academic_year', 'session', 'updated_by',
        'department', 'program', 'semester', 'section', 'shift',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeForBatch($query, $batchId)
    {
        return $query->where('batch_id', $batchId);
    }
}
