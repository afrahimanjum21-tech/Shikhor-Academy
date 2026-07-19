<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignment_submissions', function (Blueprint $table) {
            // Add each column only if it doesn't already exist (idempotent)
            if (!Schema::hasColumn('assignment_submissions', 'assignment_id')) {
                $table->foreignId('assignment_id')->after('id')->constrained('assignments')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('assignment_submissions', 'student_id')) {
                $table->foreignId('student_id')->after('assignment_id')->constrained('students')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('assignment_submissions', 'submission_file_path')) {
                $table->string('submission_file_path')->nullable()->after('student_id');
            }
            if (!Schema::hasColumn('assignment_submissions', 'submission_text')) {
                $table->text('submission_text')->nullable()->after('submission_file_path');
            }
            if (!Schema::hasColumn('assignment_submissions', 'marks_obtained')) {
                $table->decimal('marks_obtained', 5, 2)->nullable()->after('submission_text');
            }
            if (!Schema::hasColumn('assignment_submissions', 'feedback')) {
                $table->text('feedback')->nullable()->after('marks_obtained');
            }
            if (!Schema::hasColumn('assignment_submissions', 'status')) {
                $table->string('status', 20)->default('pending')->after('feedback');
            }
            if (!Schema::hasColumn('assignment_submissions', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('assignment_submissions', function (Blueprint $table) {
            $columns = ['assignment_id', 'student_id', 'submission_file_path', 'submission_text', 'marks_obtained', 'feedback', 'status', 'submitted_at'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('assignment_submissions', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
