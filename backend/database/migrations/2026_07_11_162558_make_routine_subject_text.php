<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->text('subject')->nullable()->change();
            $table->text('teacher_name')->nullable()->change();
            $table->string('room_no', 100)->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->string('subject', 255)->nullable()->change();
            $table->string('teacher_name', 255)->nullable()->change();
            $table->string('room_no', 255)->nullable()->change();
        });
    }
};
