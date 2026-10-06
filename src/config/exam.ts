export interface ExamTarget {
  id: string;
  exam: string;
  displayName: string;
  targetMonth: string; // e.g. "November 2026"
  exactDate: string | null; // e.g. "2026-11-01"
  isOfficialDate: boolean;
}

export const EXAM_TARGETS: Record<string, ExamTarget> = {
  'INI-CET_NOV_26': {
    id: 'INI-CET_NOV_26',
    exam: 'INI-CET',
    displayName: 'INI-CET',
    targetMonth: 'November 2026',
    exactDate: '2026-11-01',
    isOfficialDate: true
  },
  'NEET_PG_MARCH_27': {
    id: 'NEET_PG_MARCH_27',
    exam: 'NEET-PG',
    displayName: 'NEET-PG',
    targetMonth: 'March 2027',
    exactDate: null,
    isOfficialDate: false
  }
};

export const CURRENT_EXAM_ID = 'INI-CET_NOV_26';

export function getExamCountdown(target: ExamTarget) {
  if (target.exactDate) {
    const targetDate = new Date(target.exactDate);
    const now = new Date();
    const diffTime = Math.abs(targetDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (targetDate.getTime() < now.getTime()) {
      return { type: 'past', label: 'Exam completed' };
    }
    
    // We only want to count days in between today and exam day.
    const daysInBetween = Math.max(0, diffDays - 1);
    
    return { type: 'exact', days: daysInBetween, label: `${daysInBetween} DAYS` };
  } else {
    // Approximate mode
    const [monthStr, yearStr] = target.targetMonth.split(' ');
    const monthMap: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const targetDate = new Date(parseInt(yearStr), monthMap[monthStr], 15); // middle of month
    const now = new Date();
    
    if (targetDate.getTime() < now.getTime()) {
      return { type: 'past', label: 'Exam period passed' };
    }
    
    const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    if (diffMonths <= 0) return { type: 'approximate', label: '< 1 month remaining' };
    if (diffMonths === 1) return { type: 'approximate', label: '~1 month remaining' };
    return { type: 'approximate', label: `~${diffMonths} months remaining` };
  }
}
