<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Students টেবিলে কলাম যোগ
        Schema::table('students', function (Blueprint $table) {
            
            // 🔥 ফিক্স: DOB কলামটি যোগ করা হলো
            if (!Schema::hasColumn('students', 'dob')) {
                $table->date('dob')->nullable();
            }

            // অন্যান্য কলাম
            if (!Schema::hasColumn('students', 'gender')) $table->string('gender')->nullable();
            if (!Schema::hasColumn('students', 'nationality')) $table->string('nationality')->default('Bangladeshi');
            if (!Schema::hasColumn('students', 'religion')) $table->string('religion')->nullable();
            if (!Schema::hasColumn('students', 'blood_group')) $table->string('blood_group')->nullable();
            
            if (!Schema::hasColumn('students', 'father_name')) $table->string('father_name')->nullable();
            if (!Schema::hasColumn('students', 'father_mobile')) $table->string('father_mobile')->nullable();
            if (!Schema::hasColumn('students', 'father_occupation')) $table->string('father_occupation')->nullable();
            
            if (!Schema::hasColumn('students', 'mother_name')) $table->string('mother_name')->nullable();
            if (!Schema::hasColumn('students', 'mother_mobile')) $table->string('mother_mobile')->nullable();
            if (!Schema::hasColumn('students', 'mother_occupation')) $table->string('mother_occupation')->nullable();
            
            if (!Schema::hasColumn('students', 'present_address')) $table->text('present_address')->nullable();
            if (!Schema::hasColumn('students', 'permanent_address')) $table->text('permanent_address')->nullable();
            
            if (!Schema::hasColumn('students', 'emergency_name')) $table->string('emergency_name')->nullable();
            if (!Schema::hasColumn('students', 'emergency_mobile')) $table->string('emergency_mobile')->nullable();
            if (!Schema::hasColumn('students', 'emergency_relation')) $table->string('emergency_relation')->nullable();
            
            if (!Schema::hasColumn('students', 'last_school')) $table->string('last_school')->nullable();
            if (!Schema::hasColumn('students', 'jsc_gpa')) $table->string('jsc_gpa')->nullable();
            if (!Schema::hasColumn('students', 'ssc_gpa')) $table->string('ssc_gpa')->nullable();
        });

        // 2. Admission Applications টেবিলে কলাম যোগ (সিঙ্ক রাখার জন্য)
        Schema::table('admission_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('admission_applications', 'gender')) $table->string('gender')->nullable();
            if (!Schema::hasColumn('admission_applications', 'nationality')) $table->string('nationality')->default('Bangladeshi');
            if (!Schema::hasColumn('admission_applications', 'religion')) $table->string('religion')->nullable();
            if (!Schema::hasColumn('admission_applications', 'blood_group')) $table->string('blood_group')->nullable();
            
            if (!Schema::hasColumn('admission_applications', 'father_mobile')) $table->string('father_mobile')->nullable();
            if (!Schema::hasColumn('admission_applications', 'father_email')) $table->string('father_email')->nullable();
            if (!Schema::hasColumn('admission_applications', 'father_occupation')) $table->string('father_occupation')->nullable();
            
            if (!Schema::hasColumn('admission_applications', 'mother_mobile')) $table->string('mother_mobile')->nullable();
            if (!Schema::hasColumn('admission_applications', 'mother_email')) $table->string('mother_email')->nullable();
            if (!Schema::hasColumn('admission_applications', 'mother_occupation')) $table->string('mother_occupation')->nullable();
            
            if (!Schema::hasColumn('admission_applications', 'permanent_address')) $table->text('permanent_address')->nullable();
            
            if (!Schema::hasColumn('admission_applications', 'emergency_name')) $table->string('emergency_name')->nullable();
            if (!Schema::hasColumn('admission_applications', 'emergency_mobile')) $table->string('emergency_mobile')->nullable();
            if (!Schema::hasColumn('admission_applications', 'emergency_relation')) $table->string('emergency_relation')->nullable();
            
            if (!Schema::hasColumn('admission_applications', 'last_school')) $table->string('last_school')->nullable();
            if (!Schema::hasColumn('admission_applications', 'jsc_gpa')) $table->string('jsc_gpa')->nullable();
            if (!Schema::hasColumn('admission_applications', 'ssc_gpa')) $table->string('ssc_gpa')->nullable();
        });
    }

    public function down()
    {
        //
    }
};