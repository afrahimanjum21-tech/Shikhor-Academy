<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();

            // --- General ---
            $table->string('site_name')->default('Uttoron Coaching Center');
            $table->string('home_hero_title')->nullable();
            $table->text('home_hero_subtitle')->nullable();
            $table->text('footer_description')->nullable();

            // --- Public Contact Info ---
            $table->text('address')->nullable();
            $table->string('map_link')->nullable();         // clickable short link (maps.app.goo.gl/...)
            $table->text('map_embed_url')->nullable();      // iframe-embeddable URL (google.com/maps/embed?pb=...)
            $table->string('phone')->nullable();
            $table->string('email')->nullable();            // public-facing contact email

            // --- Social Media ---
            $table->string('facebook_url')->nullable();
            $table->string('youtube_url')->nullable();
            $table->string('twitter_url')->nullable();
            $table->string('instagram_url')->nullable();

            // --- About Us content (markdown) ---
            $table->longText('about_content')->nullable();

            // --- Stats (for About page) ---
            $table->integer('student_count')->default(0);
            $table->integer('years_experience')->default(0);
            $table->string('success_rate')->default('0%');

            // --- Notification Emails (where messages/admissions go) ---
            $table->string('admission_email')->nullable();   // receives new admission applications
            $table->string('messages_email')->nullable();    // receives contact form messages

            // --- SMTP Configuration (dynamic, used to SEND emails) ---
            $table->string('smtp_host')->nullable();
            $table->string('smtp_port')->nullable();
            $table->string('smtp_username')->nullable();
            $table->string('smtp_password')->nullable();     // Gmail App Password (16 chars)
            $table->string('smtp_from_address')->nullable();
            $table->string('smtp_from_name')->nullable();
            $table->string('smtp_encryption')->nullable();   // tls / ssl / null

            $table->timestamps();
        });

        // Seed the singleton row with sensible defaults
        \DB::table('site_settings')->insert([
            'site_name'         => 'Uttoron Coaching Center',
            'home_hero_title'   => \App\Models\SiteSetting::DEFAULT_HOME_HERO_TITLE,
            'home_hero_subtitle'=> \App\Models\SiteSetting::DEFAULT_HOME_HERO_SUBTITLE,
            'footer_description'=> \App\Models\SiteSetting::DEFAULT_FOOTER_DESCRIPTION,
            'address'           => \App\Models\SiteSetting::DEFAULT_ADDRESS,
            'map_link'          => \App\Models\SiteSetting::DEFAULT_MAP_LINK,
            'map_embed_url'     => \App\Models\SiteSetting::DEFAULT_MAP_EMBED_URL,
            'phone'             => '+880 1700-000000',
            'email'             => 'info@uttoron.com',
            'about_content'     => \App\Models\SiteSetting::DEFAULT_ABOUT_CONTENT,
            'admission_email'   => 'afrahimanjum21@gmail.com',
            'messages_email'    => 'afrahimanjum21@gmail.com',
            'smtp_host'         => 'smtp.gmail.com',
            'smtp_port'         => '587',
            'smtp_encryption'   => 'tls',
            'smtp_username'     => 'uttoron-coaching-center',
            'smtp_password'     => '',
            'smtp_from_address' => 'afrahimanjum21@gmail.com',
            'smtp_from_name'    => 'Uttoron Coaching Center',
            'student_count'     => 0,
            'years_experience'  => 0,
            'success_rate'      => '0%',
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
