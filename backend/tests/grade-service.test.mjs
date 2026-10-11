import test from 'node:test';
import assert from 'node:assert/strict';
import GradeService from '../services/GradeService.js';

// §D canonical grade map + I-15 (pass is a PERCENTAGE rule, not absolute >=33).

test('I-15: 40 out of 500 is 8% → Fail (not a pass just because 40 >= 33)', () => {
  const c = GradeService.calculate(40, 500);
  assert.equal(c.percentage, 8);
  assert.equal(c.grade, 'F');
  assert.equal(c.status, 'Fail');
});

test('grade boundaries map by percentage', () => {
  assert.equal(GradeService.calculate(80, 100).grade, 'A+');
  assert.equal(GradeService.calculate(80, 100).gpa, 5);
  assert.equal(GradeService.calculate(40, 100).grade, 'C');   // 40% pass
  assert.equal(GradeService.calculate(40, 100).status, 'Pass');
  assert.equal(GradeService.calculate(33, 100).grade, 'D');   // 33% = pass threshold
  assert.equal(GradeService.calculate(33, 100).status, 'Pass');
  assert.equal(GradeService.calculate(32, 100).grade, 'F');   // below 33%
  assert.equal(GradeService.calculate(32, 100).status, 'Fail');
});

test('isPass / passFailStatus are percentage based', () => {
  assert.equal(GradeService.isPass(33), true);
  assert.equal(GradeService.isPass(32.99), false);
  assert.equal(GradeService.passFailStatus(8), 'Fail');
});

test('a zero/invalid denominator does not divide by zero', () => {
  assert.equal(GradeService.calculatePercentage(40, 0), 0);
  assert.equal(GradeService.calculate(40, 0).grade, 'F');
});
