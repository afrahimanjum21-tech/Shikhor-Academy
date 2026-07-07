<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('sslcommerz')->unique();
            $table->boolean('is_active')->default(false);
            $table->enum('mode', ['sandbox', 'live'])->default('sandbox');
            $table->string('store_id')->nullable();
            $table->text('store_password')->nullable();
            $table->json('enabled_methods')->nullable();
            $table->string('settlement_account_name')->nullable();
            $table->string('settlement_account_number')->nullable();
            $table->string('settlement_bank_name')->nullable();
            $table->text('instructions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_settings');
    }
};
