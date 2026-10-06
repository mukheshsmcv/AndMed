export interface TopicPerformance {
  topicId: string;
  name: string;
  subjectId: string;
  subjectName: string;
  attempts: number;
  correct: number;
  accuracy: number;
  masteryScore: number;
}

export interface SubjectPerformance {
  subjectId: string;
  name: string;
  attempts: number;
  correct: number;
  accuracy: number;
  masteryScore: number;
}

export type TopicClassification = 
  'CRITICAL_WEAKNESS' | 'EMERGING_WEAKNESS' | 'KNOWLEDGE_GAP' | 'STRONG_AREA' | 'NORMAL';

export type TrendClassification = 
  'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export type ConfidenceCalibration = 
  'OVERCONFIDENT' | 'UNDERCONFIDENT' | 'WELL_CALIBRATED' | 'INSUFFICIENT_DATA';

export interface ConfidenceData {
  highConfCorrect: number;
  highConfIncorrect: number;
  lowConfCorrect: number;
  lowConfIncorrect: number;
}

/**
 * Classifies a topic deterministically.
 */
export function classifyTopic(attempts: number, accuracy: number, masteryScore: number): TopicClassification {
  if (attempts < 5) return 'KNOWLEDGE_GAP';
  
  if (masteryScore < 30 || accuracy < 0.4) {
    return attempts >= 10 ? 'CRITICAL_WEAKNESS' : 'EMERGING_WEAKNESS';
  }
  
  if (masteryScore > 80 && accuracy >= 0.75) {
    return 'STRONG_AREA';
  }
  
  return 'NORMAL';
}

/**
 * Classifies the trend based on recent accuracy vs historical accuracy.
 */
export function classifyTrend(recentAttempts: number, recentAccuracy: number, historicalAttempts: number, historicalAccuracy: number): TrendClassification {
  if (recentAttempts < 10 || historicalAttempts < 20) return 'INSUFFICIENT_DATA';
  
  const diff = recentAccuracy - historicalAccuracy;
  
  if (diff > 0.05) return 'IMPROVING';
  if (diff < -0.05) return 'DECLINING';
  
  return 'STABLE';
}

/**
 * Classifies confidence calibration.
 */
export function classifyConfidence(data: ConfidenceData): ConfidenceCalibration {
  const total = data.highConfCorrect + data.highConfIncorrect + data.lowConfCorrect + data.lowConfIncorrect;
  if (total < 15) return 'INSUFFICIENT_DATA';

  const highConfTotal = data.highConfCorrect + data.highConfIncorrect;
  const lowConfTotal = data.lowConfCorrect + data.lowConfIncorrect;

  const highConfAccuracy = highConfTotal > 0 ? data.highConfCorrect / highConfTotal : 0;
  const lowConfAccuracy = lowConfTotal > 0 ? data.lowConfCorrect / lowConfTotal : 0;

  if (highConfTotal >= 5 && highConfAccuracy < 0.4) return 'OVERCONFIDENT';
  if (lowConfTotal >= 5 && lowConfAccuracy > 0.8) return 'UNDERCONFIDENT';

  return 'WELL_CALIBRATED';
}
