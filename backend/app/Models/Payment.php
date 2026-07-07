<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;
    protected $fillable = [
        'student_id', 'month', 'amount', 'trx_id', 'method', 'status', 'date',
        'ssl_sessionkey', 'ssl_val_id', 'ssl_store_amount', 'ssl_card_type', 'ssl_card_no'
    ];

    public function student() {
        return $this->belongsTo(Student::class);
    }
}