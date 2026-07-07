<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. ROLES & USERS UPDATE
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['super_admin', 'admin', 'accountant', 'teacher', 'student'])->default('student')->after('email');
            $table->string('phone')->nullable()->after('password');
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
        });

        // 2. COURSES
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('category');
            $table->decimal('fee', 10, 2)->default(0);
            $table->string('thumbnail')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. ADMISSION APPLICATIONS
        Schema::create('admission_applications', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('father_name');
            $table->string('mother_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->date('dob');
            $table->text('address');
            $table->string('previous_school')->nullable();
            $table->string('photo_path')->nullable();
            $table->foreignId('course_id')->constrained('courses');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_remarks')->nullable();
            $table->timestamps();
        });

        // 4. BATCHES
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('capacity')->default(30);
            $table->timestamps();
        });

        // 5. STUDENTS
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('student_id_card_no')->unique();
            $table->foreignId('admission_id')->nullable();
            $table->foreignId('current_batch_id')->nullable()->constrained('batches');
            $table->string('guardian_phone');
            $table->date('admission_date');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('students');
        Schema::dropIfExists('batches');
        Schema::dropIfExists('admission_applications');
        Schema::dropIfExists('courses');
        // Note: Dropping columns from users table is skipped for brevity in dev
    }
};