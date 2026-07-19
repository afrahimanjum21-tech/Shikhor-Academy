<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('faculty', function (Blueprint $table) {
            $table->id();
            
            // Basic Information
            $table->string('full_name');
            $table->string('employee_id')->nullable()->unique();
            $table->string('profile_photo_path')->nullable();
            $table->string('cover_photo_path')->nullable();
            $table->string('gender')->nullable();
            $table->date('date_of_birth')->nullable();
            
            // Professional Information
            $table->string('designation');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->text('specialization')->nullable();
            $table->text('qualification')->nullable();
            $table->integer('teaching_experience')->default(0); // in years
            $table->text('biography')->nullable();
            
            // Professional Details
            $table->json('awards')->nullable();
            $table->json('achievements')->nullable();
            $table->json('certifications')->nullable();
            $table->json('publications')->nullable();
            $table->text('research')->nullable();
            
            // Contact
            $table->string('official_email')->nullable();
            $table->string('official_phone')->nullable();
            
            // Visibility
            $table->boolean('public_profile_enabled')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            
            // SEO
            $table->string('slug')->unique();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('og_image')->nullable();
            
            // Link to user account (for login)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Soft delete
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faculty');
    }
};
