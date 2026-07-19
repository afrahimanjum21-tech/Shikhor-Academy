<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            if (!Schema::hasColumn('study_materials', 'description')) {
                $table->text('description')->nullable()->after('title');
            }
            if (!Schema::hasColumn('study_materials', 'batch_id')) {
                $table->foreignId('batch_id')->nullable()->constrained()->nullOnDelete()->after('description');
            }
            if (!Schema::hasColumn('study_materials', 'subject')) {
                $table->string('subject', 255)->nullable()->after('batch_id');
            }
            if (!Schema::hasColumn('study_materials', 'uploaded_by')) {
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete()->after('file_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('uploaded_by');
            $table->dropConstrainedForeignId('batch_id');
            $table->dropColumn(['description', 'subject']);
        });
    }
};
