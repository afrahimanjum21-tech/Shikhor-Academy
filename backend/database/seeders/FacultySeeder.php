<?php

namespace Database\Seeders;

use App\Models\Faculty;
use App\Models\FacultyCategory;
use App\Models\Department;
use App\Models\Subject;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FacultySeeder extends Seeder
{
    public function run(): void
{
        $categories = FacultyCategory::all();
        $departments = Department::all();
        $subjects = Subject::all();

        if ($categories->isEmpty()) {
            $this->command->warn('No faculty categories found. Skipping faculty seeder.');
            return;
        }

        $facultyMembers = [
            [
                'full_name' => 'Dr. Mohammad Hasan',
                'designation' => 'Senior Physics Teacher',
                'official_email' => 'hasan.faculty@uttoron.com',
                'official_phone' => '01912345678',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'Expert in Physics with 10+ years of teaching experience. Specialized in SSC and HSC physics preparation.',
                'specialization' => 'Physics',
                'qualification' => 'M.Sc. in Physics',
                'teaching_experience' => 10,
                'is_featured' => true,
                'is_active' => true,
            ],
            [
                'full_name' => 'Professor Nasreen Akter',
                'designation' => 'Head of Chemistry Department',
                'official_email' => 'nasreen.faculty@uttoron.com',
                'official_phone' => '01923456789',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'Ph.D. in Chemistry with 15 years of teaching experience. Expert in organic and inorganic chemistry.',
                'specialization' => 'Chemistry',
                'qualification' => 'Ph.D. in Chemistry',
                'teaching_experience' => 15,
                'is_featured' => true,
                'is_active' => true,
            ],
            [
                'full_name' => 'Abdul Rahman',
                'designation' => 'Mathematics Expert',
                'official_email' => 'rahman.faculty@uttoron.com',
                'official_phone' => '01934567890',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'M.Sc. in Mathematics with 8 years of teaching experience. Specialized in calculus and algebra.',
                'specialization' => 'Mathematics',
                'qualification' => 'M.Sc. in Mathematics',
                'teaching_experience' => 8,
                'is_featured' => false,
                'is_active' => true,
            ],
            [
                'full_name' => 'Dr. Fatima Zaman',
                'designation' => 'Biology Specialist',
                'official_email' => 'fatima.faculty@uttoron.com',
                'official_phone' => '01945678901',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'Ph.D. in Biology with 12 years of teaching experience. Expert in botany and zoology.',
                'specialization' => 'Biology',
                'qualification' => 'Ph.D. in Biology',
                'teaching_experience' => 12,
                'is_featured' => true,
                'is_active' => true,
            ],
            [
                'full_name' => 'Kamal Uddin',
                'designation' => 'English Language Expert',
                'official_email' => 'kamal.faculty@uttoron.com',
                'official_phone' => '01956789012',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'M.A. in English with 7 years of teaching experience. Specialized in grammar and literature.',
                'specialization' => 'English',
                'qualification' => 'M.A. in English',
                'teaching_experience' => 7,
                'is_featured' => false,
                'is_active' => true,
            ],
            [
                'full_name' => 'Shahana Parvin',
                'designation' => 'Bangla Teacher',
                'official_email' => 'shahana.faculty@uttoron.com',
                'official_phone' => '01967890123',
                'faculty_category_id' => $categories->first()->id,
                'department_id' => $departments->first()->id ?? null,
                'biography' => 'M.A. in Bangla with 5 years of teaching experience. Expert in Bengali literature and grammar.',
                'specialization' => 'Bangla',
                'qualification' => 'M.A. in Bangla',
                'teaching_experience' => 5,
                'is_featured' => false,
                'is_active' => true,
            ],
        ];

        foreach ($facultyMembers as $facultyData) {
            $faculty = Faculty::updateOrCreate(
                ['official_email' => $facultyData['official_email']],
                [
                    'full_name' => $facultyData['full_name'],
                    'slug' => Str::slug($facultyData['full_name']),
                    'designation' => $facultyData['designation'],
                    'official_phone' => $facultyData['official_phone'],
                    'faculty_category_id' => $facultyData['faculty_category_id'],
                    'department_id' => $facultyData['department_id'],
                    'biography' => $facultyData['biography'],
                    'specialization' => $facultyData['specialization'],
                    'qualification' => $facultyData['qualification'],
                    'teaching_experience' => $facultyData['teaching_experience'],
                    'is_featured' => $facultyData['is_featured'],
                    'is_active' => $facultyData['is_active'],
                    'display_order' => rand(1, 100),
                ]
            );

            // Attach subjects if available
            if ($subjects->isNotEmpty()) {
                $faculty->subjects()->attach($subjects->random(rand(1, 3))->pluck('id'));
            }
        }

        $this->command->info('Faculty members seeded successfully.');
    }
}
