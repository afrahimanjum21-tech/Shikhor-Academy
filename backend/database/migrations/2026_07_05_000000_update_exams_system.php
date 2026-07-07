<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            // Type: monthly (full exam) vs mcq (weekly test)
            $table->enum('type', ['monthly', 'mcq'])->default('monthly')->after('name');

            // Publish gate: students only see results when this is true
            $table->boolean('is_published')->default(false)->after('date');

            // Per-subject full marks, e.g. {"Physics": 100, "MCQ": 25}
            // Null = all subjects default to 100 (backward compatible)
            $table->json('subject_marks')->nullable()->after('subjects');
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['type', 'is_published', 'subject_marks']);
        });
    }
};
