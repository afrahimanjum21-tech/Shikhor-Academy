<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds lightweight academic metadata to the routines table.
 *
 * The system keys off Course -> Batch, and there are no relational
 * department/program/semester/section/shift tables. To avoid a risky
 * cross-module schema change, these academic dimensions are stored as
 * nullable strings on each routine row. They power the admin filter bar
 * and the printed timetable header, while batch_id remains the binding
 * key used for student auto-detection.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->string('department')->nullable()->after('session');
            $table->string('program')->nullable()->after('department');
            $table->string('semester')->nullable()->after('program');
            $table->string('section')->nullable()->after('semester');
            $table->string('shift')->nullable()->after('section');
        });
    }

    public function down()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->dropColumn(['department', 'program', 'semester', 'section', 'shift']);
        });
    }
};
