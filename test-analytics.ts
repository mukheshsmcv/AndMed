// Local function simulating the backend query aggregation logic exactly as written in the API
function aggregateAnalytics(sessions: any[], startDateStr: string, endDateStr: string) {
  const dailyData = new Map<string, { durationSeconds: number; sessionCount: number }>();
  let curr = new Date(startDateStr);
  const end = new Date(endDateStr);
  let rangeDays = 0;
  
  while (curr <= end) {
    const dStr = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
    dailyData.set(dStr, { durationSeconds: 0, sessionCount: 0 });
    curr.setDate(curr.getDate() + 1);
    rangeDays++;
  }

  sessions.forEach((s: any) => {
    // Only valid COMPLETED sessions > 0 duration
    if (s.status !== 'COMPLETED' || s.duration_seconds < 1) return;
    
    // Simulate timezone offset string extraction
    const d = new Date(s.started_at);
    // Simulate getting client local string assuming UTC and client are same for this deterministic test
    const dayStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    
    if (dailyData.has(dayStr)) {
      const current = dailyData.get(dayStr)!;
      current.durationSeconds += s.duration_seconds;
      current.sessionCount += 1;
    }
  });

  let totalSeconds = 0;
  let studyDaysCount = 0;
  const daysArray: any[] = [];

  const sortedDates = Array.from(dailyData.keys()).sort();
  
  sortedDates.forEach(date => {
    const d = dailyData.get(date)!;
    daysArray.push({
      date,
      durationSeconds: d.durationSeconds,
      sessionCount: d.sessionCount
    });
    
    totalSeconds += d.durationSeconds;
    if (d.durationSeconds > 0) {
      studyDaysCount++;
    }
  });

  const averageSeconds = rangeDays > 0 ? Math.round(totalSeconds / rangeDays) : 0;

  return {
    days: daysArray,
    totalSeconds,
    averageSeconds,
    studyDays: studyDaysCount
  };
}

function runTests() {
  const sessions = [
    // Day 1: 1 hour
    { started_at: '2026-10-01T10:00:00Z', duration_seconds: 3600, status: 'COMPLETED' },
    // Day 2: 0 (No session)
    // Day 3: 2 hours (multiple sessions)
    { started_at: '2026-10-03T09:00:00Z', duration_seconds: 3600, status: 'COMPLETED' },
    { started_at: '2026-10-03T15:00:00Z', duration_seconds: 3600, status: 'COMPLETED' },
    // Day 4: 30 minutes
    { started_at: '2026-10-04T12:00:00Z', duration_seconds: 1800, status: 'COMPLETED' },
    // Day 5: 3 hours
    { started_at: '2026-10-05T14:00:00Z', duration_seconds: 10800, status: 'COMPLETED' },
    // Invalid/Ignored sessions
    { started_at: '2026-10-05T18:00:00Z', duration_seconds: 3600, status: 'ACTIVE' }, // excluded
    { started_at: '2026-10-04T16:00:00Z', duration_seconds: 0, status: 'COMPLETED' }, // excluded
    { started_at: '2026-10-02T10:00:00Z', duration_seconds: -100, status: 'COMPLETED' } // excluded
  ];

  const result = aggregateAnalytics(sessions, '2026-10-01', '2026-10-05');
  
  let failed = 0;

  const EXPECTED_TOTAL = 3600 + 7200 + 1800 + 10800; // 6h 30m = 23400s
  const EXPECTED_STUDY_DAYS = 4;
  const EXPECTED_AVERAGE = Math.round(23400 / 5); // 1h 18m = 4680s

  if (result.totalSeconds !== EXPECTED_TOTAL) {
    console.error(`FAIL: Expected TOTAL ${EXPECTED_TOTAL}, got ${result.totalSeconds}`);
    failed++;
  } else {
    console.log(`PASS: TOTAL ${result.totalSeconds} (6h 30m)`);
  }

  if (result.studyDays !== EXPECTED_STUDY_DAYS) {
    console.error(`FAIL: Expected STUDY DAYS ${EXPECTED_STUDY_DAYS}, got ${result.studyDays}`);
    failed++;
  } else {
    console.log(`PASS: STUDY DAYS ${result.studyDays}`);
  }

  if (result.averageSeconds !== EXPECTED_AVERAGE) {
    console.error(`FAIL: Expected AVG ${EXPECTED_AVERAGE}, got ${result.averageSeconds}`);
    failed++;
  } else {
    console.log(`PASS: DAILY AVG ${result.averageSeconds} (1h 18m)`);
  }
  
  if (failed > 0) process.exit(1);
}

runTests();
