<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\TeacherProfile;
use Illuminate\Database\Seeder;


class TeacherSeeder extends Seeder
{
    public function run(): void
    {
        $teachers = [
            [
                'name' => 'Dr. Mohammad Hasan',
                'email' => 'hasan@teacher.com',
                'phone' => '01912345678',
                'password' => 'password123',
                'designation' => 'Senior Physics Teacher',
                'subject' => 'Physics',
                'bio' => 'Expert in Physics with 10+ years of teaching experience. Specialized in SSC and HSC physics preparation.',
            ],
            [
                'name' => 'Professor Nasreen Akter',
                'email' => 'nasreen@teacher.com',
                'phone' => '01923456789',
                'password' => 'password123',
                'designation' => 'Head of Chemistry Department',
                'subject' => 'Chemistry',
                'bio' => 'Ph.D. in Chemistry with 15 years of teaching experience. Expert in organic and inorganic chemistry.',
            ],
            [
                'name' => 'Abdul Rahman',
                'email' => 'rahman@teacher.com',
                'phone' => '01934567890',
                'password' => 'password123',
                'designation' => 'Mathematics Expert',
                'subject' => 'Mathematics',
                'bio' => 'M.Sc. in Mathematics with 8 years of teaching experience. Specialized in calculus and algebra.',
            ],
            [
                'name' => 'Dr. Fatima Zaman',
                'email' => 'fatima@teacher.com',
                'phone' => '01945678901',
                'password' => 'password123',
                'designation' => 'Biology Specialist',
                'subject' => 'Biology',
                'bio' => 'Ph.D. in Biology with 12 years of teaching experience. Expert in botany and zoology.',
            ],
            [
                'name' => 'Kamal Uddin',
                'email' => 'kamal@teacher.com',
                'phone' => '01956789012',
                'password' => 'password123',
                'designation' => 'English Language Expert',
                'subject' => 'English',
                'bio' => 'M.A. in English with 7 years of teaching experience. Specialized in grammar and literature.',
            ],
        ];

        foreach ($teachers as $teacherData) {
            // Create user
            $user = User::firstOrCreate(
                ['email' => $teacherData['email']],
                [
                    'name' => $teacherData['name'],
                    'password' => $teacherData['password'],
                    'role' => 'teacher',
                    'phone' => $teacherData['phone'],
                    'is_active' => true,
                ]
            );

            // Create or update teacher profile
            TeacherProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'designation' => $teacherData['designation'],
                    'subject' => $teacherData['subject'],
                    'bio' => $teacherData['bio'],
                    'joining_date' => now()->subYears(rand(1, 10)),
                ]
            );
        }

        $this->command->info('Teachers seeded successfully.');
    }
}
