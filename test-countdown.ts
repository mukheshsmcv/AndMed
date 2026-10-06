// Note: Node environment may need ts-node or similar.
// I will just use typescript to run it via npx tsx.
import { getExamCountdown, ExamTarget } from './src/config/exam';

const targetOfficial: ExamTarget = {
  id: 'TEST_EXAM',
  exam: 'TEST',
  displayName: 'Test Exam',
  targetMonth: 'November 2026',
  exactDate: '2026-11-01',
  isOfficialDate: true
};

const targetUnofficial: ExamTarget = {
  id: 'TEST_EXAM_2',
  exam: 'TEST2',
  displayName: 'Test Exam 2',
  targetMonth: 'March 2027',
  exactDate: null,
  isOfficialDate: false
};

const runTestDates = (name: string, refDate: Date, target: ExamTarget, expectedLabel: string) => {
  const result = getExamCountdown(target, refDate);
  if (result.label === expectedLabel) {
    console.log(`[PASS] ${name}: ${expectedLabel}`);
  } else {
    console.error(`[FAIL] ${name}: Expected "${expectedLabel}", got "${result.label}"`);
    process.exit(1);
  }
};

console.log("Running Countdown Tests...");
// 1. Correct day calculation (Oct 6 -> Nov 1 is 26 days)
runTestDates("26 days out", new Date(2026, 9, 6, 12, 0, 0), targetOfficial, "26 days remaining");
runTestDates("25 days out", new Date(2026, 9, 7, 8, 0, 0), targetOfficial, "25 days remaining");

// 2. Exam today
runTestDates("Exam today", new Date(2026, 10, 1, 15, 0, 0), targetOfficial, "Exam Today");

// 3. Exam passed
runTestDates("Exam passed", new Date(2026, 10, 2, 10, 0, 0), targetOfficial, "Exam Completed");

// 4. Tomorrow
runTestDates("Tomorrow", new Date(2026, 9, 31, 23, 0, 0), targetOfficial, "1 day remaining");

// 5. Timezone boundary
runTestDates("Timezone boundary early", new Date(2026, 9, 6, 0, 1, 0), targetOfficial, "26 days remaining");
runTestDates("Timezone boundary late", new Date(2026, 9, 6, 23, 59, 0), targetOfficial, "26 days remaining");

// 6. Exam date not finalized
runTestDates("Unofficial date", new Date(2026, 9, 6, 12, 0, 0), targetUnofficial, "Exam date not finalized");

console.log("All countdown tests passed!\n");
