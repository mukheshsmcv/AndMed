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

export function getExamCountdown(target: ExamTarget, referenceDate?: Date) {
  const now = referenceDate || new Date();
  
  if (target.isOfficialDate && target.exactDate) {
    const [y, m, d] = target.exactDate.split('-');
    const targetDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    
    // Normalize to UTC midnight to avoid local timezone and daylight savings anomalies
    const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const utcTarget = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
    const diffTime = utcTarget - utcNow;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { type: 'past', days: diffDays, label: 'Exam Completed' };
    }
    
    if (diffDays === 0) {
      return { type: 'exact', days: 0, label: 'Exam Today' };
    }
    
    if (diffDays === 1) {
      return { type: 'exact', days: 1, label: '1 day remaining' };
    }
    
    return { type: 'exact', days: diffDays, label: `${diffDays} days remaining` };
  } else {
    return { type: 'approximate', days: null, label: 'Exam date not finalized' };
  }
}
