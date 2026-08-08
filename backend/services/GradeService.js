const GRADE_MAP = [
  { min: 80, grade: 'A+', gpa: 5.00 },
  { min: 70, grade: 'A', gpa: 4.00 },
  { min: 60, grade: 'A-', gpa: 3.50 },
  { min: 50, grade: 'B', gpa: 3.00 },
  { min: 40, grade: 'C', gpa: 2.00 },
  { min: 33, grade: 'D', gpa: 1.00 },
  { min: 0, grade: 'F', gpa: 0.00 },
];

const PASS_THRESHOLD = 33;

class GradeService {
  static gradeFromPercentage(percentage) {
    const entry = GRADE_MAP.find(e => percentage >= e.min);
    return entry ? entry.grade : 'F';
  }

  static gpaFromPercentage(percentage) {
    const entry = GRADE_MAP.find(e => percentage >= e.min);
    return entry ? entry.gpa : 0.00;
  }

  static isPass(percentage) {
    return percentage >= PASS_THRESHOLD;
  }

  static passFailStatus(percentage) {
    return percentage >= PASS_THRESHOLD ? 'Pass' : 'Fail';
  }

  static calculateTotalObtained(marksDetails) {
    if (!marksDetails) return 0;
    if (Array.isArray(marksDetails)) {
      return marksDetails.reduce((sum, subject) => sum + (parseFloat(subject.obtained) || 0), 0);
    }
    // Object form: { subject: obtained }
    return Object.values(marksDetails).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  }

  static calculatePercentage(totalObtained, totalMarks) {
    if (!totalMarks) return 0;
    return (totalObtained / totalMarks) * 100;
  }

  static calculate(totalObtained, totalMarks) {
    const percentage = this.calculatePercentage(totalObtained, totalMarks);
    return {
      total_obtained: totalObtained,
      percentage: Math.round(percentage * 100) / 100,
      grade: this.gradeFromPercentage(percentage),
      gpa: this.gpaFromPercentage(percentage),
      status: this.passFailStatus(percentage),
    };
  }
}

export default GradeService;
