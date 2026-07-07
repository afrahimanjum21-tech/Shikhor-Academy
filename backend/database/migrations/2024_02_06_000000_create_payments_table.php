<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('month'); // যেমন: January 2026
            $table->decimal('amount', 10, 2);
            $table->string('trx_id')->nullable(); // ট্রানজ্যাকশন আইডি
            $table->string('method')->default('Cash'); // Cash, Bkash, Nagad
            $table->enum('status', ['paid', 'due', 'pending'])->default('paid');
            $table->date('date');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
};