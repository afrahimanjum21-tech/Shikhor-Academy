<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;

class SiteSettingController extends Controller
{
    /**
     * Public-safe settings only (never exposes SMTP / receiver emails).
     */
    public function show()
    {
        $data = SiteSetting::instance()->toPublicArray();

        // Override static counts with real data
        $data['student_count'] = \App\Models\Student::count();
        $data['years_experience'] = (int) date('Y') - 2022;

        return response()->json($data);
    }
}
