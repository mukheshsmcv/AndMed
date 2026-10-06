import { getExamCountdown } from './src/config/exam';

function testCountdown() {
  const target = {
    id: 'TEST_EXAM',
    exam: 'TEST',
    displayName: 'Test Exam',
    targetMonth: 'November 2026',
    exactDate: '2026-11-01',
    isOfficialDate: true
  };

  const cases = [
    { date: '2026-10-07T12:00:00Z', expectedLabel: '24 DAYS TO GO' },
    { date: '2026-10-08T12:00:00Z', expectedLabel: '23 DAYS TO GO' },
    { date: '2026-10-30T12:00:00Z', expectedLabel: '1 DAY TO GO' },
    { date: '2026-10-31T12:00:00Z', expectedLabel: '0 DAYS TO GO' },
    { date: '2026-11-01T12:00:00Z', expectedLabel: 'EXAM_DAY' },
    { date: '2026-11-02T12:00:00Z', expectedLabel: 'COMPLETED' },
  ];

  let failed = 0;
  for (const tc of cases) {
    const res = getExamCountdown(target, new Date(tc.date));
    if (res.label !== tc.expectedLabel) {
      console.error(`FAIL: ${tc.date} expected ${tc.expectedLabel} but got ${res.label}`);
      failed++;
    } else {
      console.log(`PASS: ${tc.date} -> ${res.label}`);
    }
  }
  
  if (failed > 0) process.exit(1);
}

testCountdown();
