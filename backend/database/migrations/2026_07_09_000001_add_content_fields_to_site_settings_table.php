<?php

use App\Models\SiteSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('site_settings')) {
            return;
        }

        Schema::table('site_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('site_settings', 'home_hero_title')) {
                $table->string('home_hero_title')->nullable()->after('site_name');
            }

            if (!Schema::hasColumn('site_settings', 'home_hero_subtitle')) {
                $table->text('home_hero_subtitle')->nullable()->after('home_hero_title');
            }

            if (!Schema::hasColumn('site_settings', 'footer_description')) {
                $table->text('footer_description')->nullable()->after('home_hero_subtitle');
            }
        });

        DB::table('site_settings')->where('id', 1)->update([
            'home_hero_title' => DB::raw('COALESCE(home_hero_title, ' . DB::getPdo()->quote(SiteSetting::DEFAULT_HOME_HERO_TITLE) . ')'),
            'home_hero_subtitle' => DB::raw('COALESCE(home_hero_subtitle, ' . DB::getPdo()->quote(SiteSetting::DEFAULT_HOME_HERO_SUBTITLE) . ')'),
            'footer_description' => DB::raw('COALESCE(footer_description, ' . DB::getPdo()->quote(SiteSetting::DEFAULT_FOOTER_DESCRIPTION) . ')'),
            'address' => SiteSetting::DEFAULT_ADDRESS,
            'map_link' => SiteSetting::DEFAULT_MAP_LINK,
            'map_embed_url' => SiteSetting::DEFAULT_MAP_EMBED_URL,
            'about_content' => DB::raw('COALESCE(about_content, ' . DB::getPdo()->quote(SiteSetting::DEFAULT_ABOUT_CONTENT) . ')'),
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('site_settings')) {
            return;
        }

        Schema::table('site_settings', function (Blueprint $table) {
            if (Schema::hasColumn('site_settings', 'footer_description')) {
                $table->dropColumn('footer_description');
            }

            if (Schema::hasColumn('site_settings', 'home_hero_subtitle')) {
                $table->dropColumn('home_hero_subtitle');
            }

            if (Schema::hasColumn('site_settings', 'home_hero_title')) {
                $table->dropColumn('home_hero_title');
            }
        });
    }
};
