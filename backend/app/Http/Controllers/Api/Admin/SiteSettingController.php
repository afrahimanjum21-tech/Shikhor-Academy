<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SiteSettingController extends Controller
{
    public function show()
    {
        $setting = SiteSetting::instance();
        $smtpUsername = filter_var($setting->smtp_username, FILTER_VALIDATE_EMAIL)
            ? $setting->smtp_username
            : ($setting->smtp_from_address ?: $setting->email);

        return response()->json([
            'site_name'          => $setting->site_name,
            'home_hero_title'    => $setting->home_hero_title ?: SiteSetting::DEFAULT_HOME_HERO_TITLE,
            'home_hero_subtitle' => $setting->home_hero_subtitle ?: SiteSetting::DEFAULT_HOME_HERO_SUBTITLE,
            'footer_description' => $setting->footer_description ?: SiteSetting::DEFAULT_FOOTER_DESCRIPTION,
            'address'            => $setting->address,
            'map_link'           => $setting->map_link,
            'map_embed_url'      => $setting->map_embed_url,
            'phone'              => $setting->phone,
            'email'              => $setting->email,
            'facebook_url'       => $setting->facebook_url,
            'youtube_url'        => $setting->youtube_url,
            'twitter_url'        => $setting->twitter_url,
            'instagram_url'      => $setting->instagram_url,
            'about_content'      => $setting->about_content ?: SiteSetting::DEFAULT_ABOUT_CONTENT,
            'student_count'      => $setting->student_count,
            'years_experience'   => $setting->years_experience,
            'success_rate'       => $setting->success_rate,
            'admission_email'    => $setting->admission_email,
            'messages_email'     => $setting->messages_email,
            'smtp_host'          => $setting->smtp_host,
            'smtp_port'          => $setting->smtp_port,
            'smtp_username'      => $smtpUsername,
            'has_smtp_password'  => filled($setting->smtp_password),
            'smtp_from_address'  => $setting->smtp_from_address,
            'smtp_from_name'     => $setting->smtp_from_name,
            'smtp_encryption'    => $setting->smtp_encryption,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'site_name'         => ['nullable', 'string', 'max:255'],
            'home_hero_title'   => ['nullable', 'string', 'max:255'],
            'home_hero_subtitle'=> ['nullable', 'string', 'max:1000'],
            'footer_description'=> ['nullable', 'string', 'max:1000'],
            'address'           => ['nullable', 'string', 'max:1000'],
            'map_link'          => ['nullable', 'string', 'max:500'],
            'map_embed_url'     => ['nullable', 'string', 'max:1000'],
            'phone'             => ['nullable', 'string', 'max:50'],
            'email'             => ['nullable', 'email', 'max:255'],
            'facebook_url'      => ['nullable', 'string', 'max:500'],
            'youtube_url'       => ['nullable', 'string', 'max:500'],
            'twitter_url'       => ['nullable', 'string', 'max:500'],
            'instagram_url'     => ['nullable', 'string', 'max:500'],
            'about_content'     => ['nullable', 'string'],
            'student_count'     => ['nullable', 'integer', 'min:0'],
            'years_experience'  => ['nullable', 'integer', 'min:0'],
            'success_rate'      => ['nullable', 'string', 'max:50'],
            'admission_email'   => ['nullable', 'email', 'max:255'],
            'messages_email'    => ['nullable', 'email', 'max:255'],
            'smtp_host'         => ['nullable', 'string', 'max:255'],
            'smtp_port'         => ['nullable', 'string', 'max:10'],
            'smtp_username'     => ['nullable', 'email', 'max:255'],
            'smtp_password'     => ['nullable', 'string', 'max:255'],
            'smtp_from_address' => ['nullable', 'email', 'max:255'],
            'smtp_from_name'    => ['nullable', 'string', 'max:255'],
            'smtp_encryption'   => ['nullable', 'in:tls,ssl,none'],
        ]);

        $setting = SiteSetting::instance();

        $updateData = collect($validated)->except('smtp_password')->toArray();

        if (blank($updateData['smtp_username'] ?? null)) {
            $updateData['smtp_username'] = $updateData['smtp_from_address']
                ?? $updateData['email']
                ?? $setting->smtp_from_address
                ?? $setting->email;
        }

        if (blank($updateData['smtp_from_address'] ?? null) && filled($updateData['smtp_username'] ?? null)) {
            $updateData['smtp_from_address'] = $updateData['smtp_username'];
        }

        // SMTP password only updates when a new value is provided (empty = keep existing)
        if (filled($request->input('smtp_password'))) {
            $updateData['smtp_password'] = SiteSetting::normalizeAppPassword($request->input('smtp_password'));
        }

        $setting->fill($updateData)->save();

        return response()->json([
            'message' => 'Site settings updated successfully',
            'settings' => [
                'site_name'          => $setting->site_name,
                'home_hero_title'    => $setting->home_hero_title ?: SiteSetting::DEFAULT_HOME_HERO_TITLE,
                'home_hero_subtitle' => $setting->home_hero_subtitle ?: SiteSetting::DEFAULT_HOME_HERO_SUBTITLE,
                'footer_description' => $setting->footer_description ?: SiteSetting::DEFAULT_FOOTER_DESCRIPTION,
                'address'            => $setting->address,
                'map_link'           => $setting->map_link,
                'map_embed_url'      => $setting->map_embed_url,
                'phone'              => $setting->phone,
                'email'              => $setting->email,
                'facebook_url'       => $setting->facebook_url,
                'youtube_url'        => $setting->youtube_url,
                'twitter_url'        => $setting->twitter_url,
                'instagram_url'      => $setting->instagram_url,
                'about_content'      => $setting->about_content ?: SiteSetting::DEFAULT_ABOUT_CONTENT,
                'student_count'      => $setting->student_count,
                'years_experience'   => $setting->years_experience,
                'success_rate'       => $setting->success_rate,
                'admission_email'    => $setting->admission_email,
                'messages_email'     => $setting->messages_email,
                'smtp_host'          => $setting->smtp_host,
                'smtp_port'          => $setting->smtp_port,
                'smtp_username'      => filter_var($setting->smtp_username, FILTER_VALIDATE_EMAIL)
                    ? $setting->smtp_username
                    : ($setting->smtp_from_address ?: $setting->email),
                'has_smtp_password'  => filled($setting->smtp_password),
                'smtp_from_address'  => $setting->smtp_from_address,
                'smtp_from_name'     => $setting->smtp_from_name,
                'smtp_encryption'    => $setting->smtp_encryption,
            ],
        ]);
    }
}
