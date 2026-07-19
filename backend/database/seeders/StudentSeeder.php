<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\User;
use App\Models\Course;
use App\Models\Batch;
use Illuminate\Database\Seeder;

use Illuminate\Support\Str;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $courses = Course::all();
        $batches = Batch::all();

        if ($courses->isEmpty()) {
            $this->command->warn('No courses found. Skipping student seeder.');
            return;
        }

        $students = [
            [
                'name' => 'Rahim Ahmed',
                'email' => 'rahim@student.com',
                'phone' => '01712345678',
                'password' => 'password123',
                'present_address' => 'Meherpur, Gangni',
                'father_name' => 'Abdul Karim',
                'father_mobile' => '01812345678',
                'mother_name' => 'Fatima Begum',
                'mother_mobile' => '01812345679',
                'course_id' => $courses->first()->id,
            ],
            [
                'name' => 'Fatima Begum',
                'email' => 'fatima@student.com',
                'phone' => '01723456789',
                'password' => 'password123',
                'present_address' => 'Meherpur Sadar',
                'father_name' => 'Mohammad Ali',
                'father_mobile' => '01823456789',
                'mother_name' => 'Rahima Akter',
                'mother_mobile' => '01823456790',
                'course_id' => $courses->first()->id,
            ],
            [
                'name' => 'Karim Hossain',
                'email' => 'karim@student.com',
                'phone' => '01734567890',
                'password' => 'password123',
                'present_address' => 'Gangni Upazila',
                'father_name' => 'Jafar Iqbal',
                'father_mobile' => '01834567890',
                'mother_name' => 'Sultana Parvin',
                'mother_mobile' => '01834567891',
                'course_id' => $courses->first()->id,
            ],
            [
                'name' => 'Ayesha Khan',
                'email' => 'ayesha@student.com',
                'phone' => '01745678901',
                'password' => 'password123',
                'present_address' => 'Harabhanga',
                'father_name' => 'Rahman Mia',
                'father_mobile' => '01845678901',
                'mother_name' => 'Khaleda Begum',
                'mother_mobile' => '01845678902',
                'course_id' => $courses->first()->id,
            ],
            [
                'name' => 'Jamal Uddin',
                'email' => 'jamal@student.com',
                'phone' => '01756789012',
                'password' => 'password123',
                'present_address' => 'Meherpur',
                'father_name' => 'Kamal Hossain',
                'father_mobile' => '01856789012',
                'mother_name' => 'Nasreen Akter',
                'mother_mobile' => '01856789013',
                'course_id' => $courses->first()->id,
            ],
        ];

        foreach ($students as $studentData) {
            // Create user
            $user = User::firstOrCreate(
                ['email' => $studentData['email']],
                [
                    'name' => $studentData['name'],
                    'password' => $studentData['password'],
                    'role' => 'student',
                    'phone' => $studentData['phone'],
                    'is_active' => true,
                ]
            );

            // Create or update student profile
            Student::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'student_id_card_no' => 'STU' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
                    'father_name' => $studentData['father_name'],
                    'father_mobile' => $studentData['father_mobile'],
                    'mother_name' => $studentData['mother_name'],
                    'mother_mobile' => $studentData['mother_mobile'],
                    'present_address' => $studentData['present_address'],
                    'guardian_phone' => $studentData['father_mobile'],
                    'admission_date' => now()->subMonths(rand(1, 6)),
                ]
            );

            // Assign to batch if available
            if ($batches->isNotEmpty()) {
                $batch = $batches->random();
                $user->student_profile->update(['batch_id' => $batch->id]);
            }
        }

        $this->command->info('Students seeded successfully.');
    }
}
