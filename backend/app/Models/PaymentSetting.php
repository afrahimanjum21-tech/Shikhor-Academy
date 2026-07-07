<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'is_active',
        'mode',
        'store_id',
        'store_password',
        'enabled_methods',
        'settlement_account_name',
        'settlement_account_number',
        'settlement_bank_name',
        'instructions',
    ];

    protected $hidden = [
        'store_password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'enabled_methods' => 'array',
        'store_password' => 'encrypted',
    ];

    public static function sslcommerz(): self
    {
        return self::firstOrCreate(
            ['provider' => 'sslcommerz'],
            [
                'is_active' => false,
                'mode' => 'sandbox',
                'enabled_methods' => ['sslcommerz'],
            ]
        );
    }
}
