<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('course_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->constrained('course_categories')->nullOnDelete()->after('category');
            $table->json('features')->nullable()->after('description');
            $table->string('duration')->nullable()->after('fee');
            $table->integer('seats')->nullable()->after('duration');
            $table->string('teacher_name')->nullable()->after('seats');
            $table->string('class_mode')->nullable()->after('teacher_name');
            $table->decimal('discount_price', 10, 2)->nullable()->after('fee');
            $table->integer('sorting_order')->default(0)->after('discount_price');
            $table->boolean('is_featured')->default(false)->after('sorting_order');
        });
    }

    public function down()
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn([
                'category_id', 'features', 'duration', 'seats',
                'teacher_name', 'class_mode', 'discount_price',
                'sorting_order', 'is_featured'
            ]);
        });
        Schema::dropIfExists('course_categories');
    }
};
