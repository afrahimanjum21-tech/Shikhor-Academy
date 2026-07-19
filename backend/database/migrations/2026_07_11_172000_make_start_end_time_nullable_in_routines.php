<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->string('start_time')->nullable()->change();
            $table->string('end_time')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('routines', function (Blueprint $table) {
            $table->string('start_time')->nullable(false)->change();
            $table->string('end_time')->nullable(false)->change();
        });
    }
};
