<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'shift')) {
                $table->string('shift')->nullable()->after('current_batch_id');
            }
            if (!Schema::hasColumn('students', 'section')) {
                $table->string('section')->nullable()->after('shift');
            }
            if (!Schema::hasColumn('students', 'group_name')) {
                $table->string('group_name')->nullable()->after('section');
            }
        });

        Schema::create('student_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('document');
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('student_documents');

        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'shift')) {
                $table->dropColumn('shift');
            }
            if (Schema::hasColumn('students', 'section')) {
                $table->dropColumn('section');
            }
            if (Schema::hasColumn('students', 'group_name')) {
                $table->dropColumn('group_name');
            }
        });
    }
};
