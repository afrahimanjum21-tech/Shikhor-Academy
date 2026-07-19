<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Science',
                'slug' => 'science',
                'description' => 'Physics, Chemistry, Biology, and Mathematics',
                'is_active' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Commerce',
                'slug' => 'commerce',
                'description' => 'Accounting, Economics, Business Studies, and Finance',
                'is_active' => true,
                'display_order' => 2,
            ],
            [
                'name' => 'Arts',
                'slug' => 'arts',
                'description' => 'Bangla, English, History, Geography, and Social Sciences',
                'is_active' => true,
                'display_order' => 3,
            ],
            [
                'name' => 'Engineering',
                'slug' => 'engineering',
                'description' => 'Civil, Electrical, Mechanical, and Computer Engineering',
                'is_active' => true,
                'display_order' => 4,
            ],
            [
                'name' => 'Medical',
                'slug' => 'medical',
                'description' => 'MBBS, BDS, Nursing, and Allied Health Sciences',
                'is_active' => true,
                'display_order' => 5,
            ],
            [
                'name' => 'Computer Science',
                'slug' => 'computer-science',
                'description' => 'Programming, Software Development, and IT',
                'is_active' => true,
                'display_order' => 6,
            ],
            [
                'name' => 'Language',
                'slug' => 'language',
                'description' => 'English, Arabic, Chinese, and other languages',
                'is_active' => true,
                'display_order' => 7,
            ],
            [
                'name' => 'General Studies',
                'slug' => 'general-studies',
                'description' => 'SSC and HSC general subjects',
                'is_active' => true,
                'display_order' => 8,
            ],
        ];

        foreach ($departments as $department) {
            Department::updateOrCreate(
                ['slug' => $department['slug']],
                $department
            );
        }
    }
}
