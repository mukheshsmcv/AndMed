import { calculateReadinessScore } from '../ReadinessEngine';

describe('ReadinessEngine', () => {
  it('returns baseline score for empty state (<20 questions)', () => {
    expect(calculateReadinessScore({
      globalMasteryAverage: 0,
      overallAccuracy: 0,
      recentAccuracy: 0,
      questionsAttempted: 0,
      criticalWeaknessesCount: 0,
      overdueRevisionCount: 0
    })).toBe(10); // default for 0 mastery
    
    expect(calculateReadinessScore({
      globalMasteryAverage: 40,
      overallAccuracy: 0,
      recentAccuracy: 0,
      questionsAttempted: 15,
      criticalWeaknessesCount: 0,
      overdueRevisionCount: 0
    })).toBe(30); // caps at 30
  });

  it('calculates deterministic repeated high-performance state', () => {
    // Mastery 90 -> 36 points
    // Overall Acc 0.8 -> 12 points
    // Recent Acc 0.85 -> 12.75 points
    // Vol bonus maxed -> 10 points
    // Total = 70.75 => 71
    expect(calculateReadinessScore({
      globalMasteryAverage: 90,
      overallAccuracy: 0.8,
      recentAccuracy: 0.85,
      questionsAttempted: 600,
      criticalWeaknessesCount: 0,
      overdueRevisionCount: 0
    })).toBe(71);
  });

  it('penalizes for critical weaknesses and overdue revisions', () => {
    // Mastery 50 -> 20 points
    // Overall Acc 0.5 -> 7.5 points
    // Recent Acc 0.5 -> 7.5 points
    // Vol -> ~2 points (100 qs)
    // Base = 37
    // Penalty: 3 critical -> -6
    // Penalty: 10 overdue -> -5
    // Result = 26
    expect(calculateReadinessScore({
      globalMasteryAverage: 50,
      overallAccuracy: 0.5,
      recentAccuracy: 0.5,
      questionsAttempted: 100,
      criticalWeaknessesCount: 3,
      overdueRevisionCount: 10
    })).toBe(26);
  });
});
