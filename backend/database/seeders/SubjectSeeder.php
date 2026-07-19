<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['name' => 'Bangla', 'display_order' => 1],
            ['name' => 'English', 'display_order' => 2],
            ['name' => 'Mathematics', 'display_order' => 3],
            ['name' => 'General Science', 'display_order' => 4],
            ['name' => 'Bangladesh & Global Studies', 'display_order' => 5],
            ['name' => 'Religious Studies', 'display_order' => 6],
            ['name' => 'ICT', 'display_order' => 7],
            ['name' => 'Physical Education & Health', 'display_order' => 8],
            ['name' => 'Career Education', 'display_order' => 9],
            ['name' => 'Physics', 'display_order' => 10],
            ['name' => 'Chemistry', 'display_order' => 11],
            ['name' => 'Biology', 'display_order' => 12],
            ['name' => 'Higher Mathematics', 'display_order' => 13],
            ['name' => 'Accounting', 'display_order' => 14],
            ['name' => 'Business Studies', 'display_order' => 15],
            ['name' => 'Finance, Banking & Insurance', 'display_order' => 16],
            ['name' => 'Economics', 'display_order' => 17],
            ['name' => 'Geography', 'display_order' => 18],
            ['name' => 'History', 'display_order' => 19],
            ['name' => 'Civics & Citizenship', 'display_order' => 20],
            ['name' => 'Civics & Governance', 'display_order' => 21],
            ['name' => 'Agricultural Studies', 'display_order' => 22],
            ['name' => 'Home Science', 'display_order' => 23],
            ['name' => 'Sociology', 'display_order' => 24],
            ['name' => 'Psychology', 'display_order' => 25],
            ['name' => 'Philosophy', 'display_order' => 26],
            ['name' => 'Logic', 'display_order' => 27],
            ['name' => 'Statistics', 'display_order' => 28],
            ['name' => 'Social Work', 'display_order' => 29],
            ['name' => 'Islamic History & Culture', 'display_order' => 30],
            ['name' => 'Nutrition & Food Science', 'display_order' => 31],
            ['name' => 'Music', 'display_order' => 32],
            ['name' => 'Art & Craft', 'display_order' => 33],
            ['name' => 'Physical Studies', 'display_order' => 34],
            ['name' => 'Production Management & Marketing', 'display_order' => 35],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['slug' => Str::slug($subject['name'])],
                [
                    'name' => $subject['name'],
                    'slug' => Str::slug($subject['name']),
                    'is_active' => true,
                    'display_order' => $subject['display_order'],
                ]
            );
        }

        $this->command->info('Subjects seeded successfully.');
    }
}
