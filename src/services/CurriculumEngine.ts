export type CurriculumStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'STUDIED' | 'MASTERED' | 'NEEDS_REVISION' | 'COMPLETED';
export type CoverageStatus = 'NONE' | 'LOW' | 'MODERATE' | 'ADEQUATE' | 'STRONG';

export interface CurriculumEvidence {
  questionsAttempted: number;
  masteryScore: number;
  hasOverdueRevision: boolean;
  manualStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export function determineCoverageStatus(questionCount: number): CoverageStatus {
  if (questionCount === 0) return 'NONE';
  if (questionCount >= 1 && questionCount <= 4) return 'LOW';
  if (questionCount >= 5 && questionCount <= 9) return 'MODERATE';
  if (questionCount >= 10 && questionCount <= 19) return 'ADEQUATE';
  return 'STRONG'; // 20+
}

/**
 * Derives a deterministic completion status for a curriculum node.
 * Uses strict thresholds to avoid false 'completion'.
 */
export function deriveCurriculumStatus(evidence: CurriculumEvidence): CurriculumStatus {
  if (evidence.hasOverdueRevision) {
    return 'NEEDS_REVISION';
  }

  // Manual completion means they've studied it, but if mastery > 75 it's MASTERED
  if (evidence.manualStatus === 'COMPLETED') {
    if (evidence.masteryScore >= 75 && evidence.questionsAttempted >= 15) {
      return 'MASTERED';
    }
    return 'COMPLETED';
  }
  
  if (evidence.manualStatus === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }

  if (evidence.questionsAttempted === 0) {
    return 'NOT_STARTED';
  }

  // Meaningful evidence: > 5 questions attempted for a node to be considered STUDIED
  if (evidence.questionsAttempted < 5) {
    return 'IN_PROGRESS';
  }

  // Mastery threshold: 75
  if (evidence.masteryScore >= 75 && evidence.questionsAttempted >= 15) {
    return 'MASTERED';
  }

  return 'STUDIED';
}

/**
 * Calculates a completion percentage deterministically based on mastery and volume.
 * Maximum is 100%.
 */
export function calculateCompletionPercentage(masteryScore: number, questionsAttempted: number, manualStatus?: string): number {
  if (manualStatus === 'COMPLETED') return 100;
  if (questionsAttempted === 0) return 0;
  
  // Volume factor (max 1.0 at 20 questions)
  const volumeFactor = Math.min(1.0, questionsAttempted / 20);
  
  // Completion is heavily tied to mastery, but weighted by volume
  const completion = (masteryScore * volumeFactor);
  return Math.min(100, Math.round(completion));
}

export interface IntegratedComponent {
  topicId: string;
  masteryScore: number;
  questionsAttempted: number;
  importance: number; // 1-10
}

/**
 * Aggregates mastery across an integrated concept based on weighted relationships.
 */
export function calculateIntegratedMastery(components: IntegratedComponent[]): number | 'INSUFFICIENT_DATA' {
  if (components.length === 0) return 'INSUFFICIENT_DATA';
  
  let totalWeight = 0;
  let weightedSum = 0;
  let totalAttempts = 0;

  for (const comp of components) {
    totalAttempts += comp.questionsAttempted;
    
    // Components with no attempts contribute 0 to the sum, dragging down the average
    // if they are important.
    const weight = comp.importance || 5;
    totalWeight += weight;
    
    if (comp.questionsAttempted > 0) {
      weightedSum += (comp.masteryScore * weight);
    }
  }

  if (totalAttempts < 10) return 'INSUFFICIENT_DATA';
  if (totalWeight === 0) return 'INSUFFICIENT_DATA';

  return Math.min(100, Math.round(weightedSum / totalWeight));
}
