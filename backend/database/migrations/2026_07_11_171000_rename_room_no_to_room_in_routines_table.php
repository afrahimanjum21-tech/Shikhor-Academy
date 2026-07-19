<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->renameColumn('room_no', 'room');
        });
    }

    public function down()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->renameColumn('room', 'room_no');
        });
    }
};
