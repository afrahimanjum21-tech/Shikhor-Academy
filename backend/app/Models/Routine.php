<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Routine extends Model
{
    use HasFactory;
    protected $fillable = ['batch_id', 'day', 'subject', 'teacher_name', 'start_time', 'end_time', 'room_no'];

    public function batch() {
        return $this->belongsTo(Batch::class);
    }
}