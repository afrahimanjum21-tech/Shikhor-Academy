<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->string('time_slot')->nullable()->after('end_time');
            $table->string('teacher')->nullable()->after('teacher_name');
            $table->string('lab')->nullable()->after('room_no');
            $table->text('notes')->nullable()->after('lab');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft')->after('notes');
            $table->string('academic_year')->nullable()->after('status');
            $table->string('session')->nullable()->after('academic_year');
            $table->foreignId('updated_by')->nullable()->constrained('users')->after('session');
        });
    }

    public function down()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
            $table->dropColumn([
                'time_slot', 'teacher', 'lab', 'notes',
                'status', 'academic_year', 'session', 'updated_by',
            ]);
        });
    }
};
