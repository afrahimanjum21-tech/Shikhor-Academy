<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'course_id', 'date']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('session', ['morning', 'evening'])->default('morning')->after('date');
            $table->time('punch_in_at')->nullable()->after('status');
            $table->time('punch_out_at')->nullable()->after('punch_in_at');
            $table->enum('leave_status', ['none', 'pending', 'approved', 'rejected'])->default('none')->after('punch_out_at');
            $table->text('leave_reason')->nullable()->after('leave_status');
            $table->timestamp('leave_requested_at')->nullable()->after('leave_reason');
            $table->timestamp('leave_approved_at')->nullable()->after('leave_requested_at');
            $table->foreignId('leave_approved_by')->nullable()->after('leave_approved_at')->constrained('users')->nullOnDelete();
            $table->unique(['student_id', 'course_id', 'date', 'session']);
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'course_id', 'date', 'session']);
            $table->dropConstrainedForeignId('leave_approved_by');
            $table->dropColumn([
                'session',
                'punch_in_at',
                'punch_out_at',
                'leave_status',
                'leave_reason',
                'leave_requested_at',
                'leave_approved_at',
            ]);
            $table->unique(['student_id', 'course_id', 'date']);
        });
    }
};
