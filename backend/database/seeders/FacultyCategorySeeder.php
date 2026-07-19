<?php

namespace Database\Seeders;

use App\Models\FacultyCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FacultyCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Professor',
                'slug' => 'professor',
                'description' => 'Senior faculty members with extensive experience',
                'is_active' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Associate Professor',
                'slug' => 'associate-professor',
                'description' => 'Experienced faculty members',
                'is_active' => true,
                'display_order' => 2,
            ],
            [
                'name' => 'Assistant Professor',
                'slug' => 'assistant-professor',
                'description' => 'Faculty members with significant teaching experience',
                'is_active' => true,
                'display_order' => 3,
            ],
            [
                'name' => 'Senior Lecturer',
                'slug' => 'senior-lecturer',
                'description' => 'Experienced lecturers',
                'is_active' => true,
                'display_order' => 4,
            ],
            [
                'name' => 'Lecturer',
                'slug' => 'lecturer',
                'description' => 'Regular teaching faculty',
                'is_active' => true,
                'display_order' => 5,
            ],
            [
                'name' => 'Teaching Assistant',
                'slug' => 'teaching-assistant',
                'description' => 'Junior faculty members supporting teaching',
                'is_active' => true,
                'display_order' => 6,
            ],
            [
                'name' => 'Guest Faculty',
                'slug' => 'guest-faculty',
                'description' => 'Visiting or part-time faculty members',
                'is_active' => true,
                'display_order' => 7,
            ],
            [
                'name' => 'Lab Instructor',
                'slug' => 'lab-instructor',
                'description' => 'Practical and laboratory instructors',
                'is_active' => true,
                'display_order' => 8,
            ],
        ];

        foreach ($categories as $category) {
            FacultyCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
