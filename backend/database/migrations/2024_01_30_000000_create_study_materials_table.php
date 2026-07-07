<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('study_materials', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('type', ['file', 'link'])->default('file'); // ফাইল নাকি লিংক
            $table->string('file_path')->nullable(); // ফাইলের জন্য
            $table->string('url')->nullable();       // লিংকের জন্য
            $table->string('file_type')->default('pdf'); // আইকনের জন্য
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('study_materials');
    }
};