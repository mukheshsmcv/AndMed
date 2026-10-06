export interface ReadinessFactors {
  globalMasteryAverage: number; // 0-100
  overallAccuracy: number; // 0-1
  recentAccuracy: number; // 0-1 (last 7 days)
  questionsAttempted: number;
  criticalWeaknessesCount: number;
  overdueRevisionCount: number;
}

/**
 * Calculates a deterministic Readiness Score (0-100).
 * This is an internal progress metric and NOT a probability of passing or rank predictor.
 */
export function calculateReadinessScore(factors: ReadinessFactors): number {
  if (factors.questionsAttempted < 20) {
    // Minimum baseline mapping
    return Math.min(30, factors.globalMasteryAverage || 10);
  }

  // Weights
  // Mastery: 40%
  // Accuracy: 30% (Split: 15% overall, 15% recent)
  // Penalties: Weaknesses (-2 per critical), Overdue Revisions (-0.5 per item max -10)
  
  const masteryComponent = factors.globalMasteryAverage * 0.40;
  
  const accuracyComponent = (factors.overallAccuracy * 100 * 0.15) + (factors.recentAccuracy * 100 * 0.15);
  
  // Volume scaling component (max 10 points awarded for doing lots of practice)
  const volumeBonus = Math.min(10, (factors.questionsAttempted / 500) * 10);
  
  let baseScore = masteryComponent + accuracyComponent + volumeBonus;
  
  // Penalties
  const weaknessPenalty = factors.criticalWeaknessesCount * 2;
  const overduePenalty = Math.min(10, factors.overdueRevisionCount * 0.5);
  
  baseScore -= (weaknessPenalty + overduePenalty);
  
  // Bound between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
  
  return finalScore;
}
