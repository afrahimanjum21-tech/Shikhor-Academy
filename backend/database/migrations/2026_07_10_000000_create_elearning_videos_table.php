<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('elearning_videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('teacher')->nullable();
            $table->string('duration')->nullable();      // "45 mins" — display string
            $table->string('video_url');                  // ইউটিউব/ফেসবুক লিংক
            $table->string('platform')->default('youtube'); // youtube | facebook
            $table->string('video_id')->nullable();       // parse করে বের করা ID
            $table->string('thumbnail_path')->nullable(); // কাস্টম আপলোড করা থাম্বনেইল
            $table->boolean('is_locked')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elearning_videos');
    }
};
