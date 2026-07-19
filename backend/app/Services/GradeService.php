<?php

namespace App\Services;

class GradeService
{
    private const PASS_PERCENTAGE = 33;

    public function gradeFromPercentage(float $percentage): string
    {
        if ($percentage >= 80) return 'A+';
        if ($percentage >= 70) return 'A';
        if ($percentage >= 60) return 'A-';
        if ($percentage >= 50) return 'B';
        if ($percentage >= 40) return 'C';
        if ($percentage >= self::PASS_PERCENTAGE) return 'D';

        return 'F';
    }

    public function gpaFromPercentage(float $percentage): float
    {
        if ($percentage >= 80) return 5.00;
        if ($percentage >= 70) return 4.00;
        if ($percentage >= 60) return 3.50;
        if ($percentage >= 50) return 3.00;
        if ($percentage >= 40) return 2.00;
        if ($percentage >= self::PASS_PERCENTAGE) return 1.00;

        return 0.00;
    }

    public function isPass(float $percentage): bool
    {
        return $percentage >= self::PASS_PERCENTAGE;
    }

    public function passFailStatus(float $percentage): string
    {
        return $this->isPass($percentage) ? 'Pass' : 'Fail';
    }

    public function calculateTotalObtained(array $marksDetails): float
    {
        return array_sum($marksDetails);
    }

    public function calculatePercentage(float $totalObtained, float $totalMarks): float
    {
        return $totalMarks > 0 ? ($totalObtained / $totalMarks) * 100 : 0;
    }

    public function calculate(array $marksDetails, float $totalMarks): array
    {
        $totalObtained = $this->calculateTotalObtained($marksDetails);
        $percentage = $this->calculatePercentage($totalObtained, $totalMarks);

        return [
            'marks_details' => $marksDetails,
            'total_obtained' => $totalObtained,
            'percentage' => $percentage,
            'grade' => $this->gradeFromPercentage($percentage),
            'gpa' => $this->gpaFromPercentage($percentage),
            'is_pass' => $this->isPass($percentage),
            'result' => $this->passFailStatus($percentage),
        ];
    }
}
