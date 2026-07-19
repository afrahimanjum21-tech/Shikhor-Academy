<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faculty', function (Blueprint $table) {
            $table->foreignId('faculty_category_id')
                ->nullable()
                ->after('department_id')
                ->constrained('faculty_categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('faculty', function (Blueprint $table) {
            $table->dropForeign(['faculty_category_id']);
            $table->dropColumn('faculty_category_id');
        });
    }
};
