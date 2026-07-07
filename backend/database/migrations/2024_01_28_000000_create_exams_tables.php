<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // এক্সাম টেবিল
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->json('subjects'); // যেমন: ["Bangla", "English", "Math"]
            $table->integer('total_marks'); // সব বিষয় মিলিয়ে মোট কত
            $table->date('date');
            $table->timestamps();
        });

        // রেজাল্ট টেবিল
        Schema::create('exam_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->json('marks_details'); // যেমন: {"Bangla": 80, "Math": 95}
            $table->double('total_obtained'); // মোট কত পেল
            $table->string('grade')->nullable(); // A+, A, F
            $table->double('gpa')->nullable();   // 5.00, 4.00
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('exam_results');
        Schema::dropIfExists('exams');
    }
};