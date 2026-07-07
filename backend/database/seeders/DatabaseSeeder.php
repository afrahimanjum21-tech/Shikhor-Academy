<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@uttoron.com'],
            [
                'name' => 'Uttoron Admin',
                'password' => Hash::make('password123'),
                'role' => 'super_admin',
                'phone' => '01700000000',
                'is_active' => true,
            ]
        );

        $courses = [
            [
                'title' => 'SSC Science Batch 2026',
                'category' => 'SSC',
                'fee' => 1500.00,
                'description' => 'Complete preparation for Physics, Chemistry, Math, and Biology.',
            ],
            [
                'title' => 'HSC English Crash Course',
                'category' => 'HSC',
                'fee' => 2500.00,
                'description' => 'Intensive English preparation for HSC candidates.',
            ],
        ];

        foreach ($courses as $course) {
            Course::updateOrCreate(
                ['slug' => Str::slug($course['title'])],
                [
                    ...$course,
                    'slug' => Str::slug($course['title']),
                    'is_active' => true,
                ]
            );
        }
    }
}
