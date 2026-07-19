<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // 'admission', 'payment', 'message', 'notice', 'routine', 'attendance', 'leave', 'assignment', 'exam', 'material', 'event'
            $table->string('icon')->nullable(); // emoji or icon name
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('action_url')->nullable();
            $table->string('action_label')->nullable(); // 'View', 'Review', 'Pay', etc.
            $table->string('level')->default('info'); // 'critical', 'warning', 'info', 'success'
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });
    }
    public function down() {
        Schema::dropIfExists('notifications');
    }
};
