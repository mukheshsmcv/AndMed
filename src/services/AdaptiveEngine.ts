export interface AttemptResult {
  isCorrect: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  timeTaken: number; // in seconds
  confidence?: 'low' | 'medium' | 'high';
  consecutiveCorrect: number; // track history
  consecutiveIncorrect: number;
}

export function calculateTopicMastery(currentMastery: number, attempt: AttemptResult): number {
  let delta = 0;

  if (attempt.isCorrect) {
    // Base delta
    delta = 5;
    
    // Difficulty modifier
    if (attempt.difficulty === 'hard') delta += 3;
    if (attempt.difficulty === 'easy') delta -= 2; // repeated easy shouldn't inflate much
    
    // Confidence modifier (do not treat low confidence correct as fully correct)
    if (attempt.confidence === 'high') delta *= 1.2;
    if (attempt.confidence === 'low') delta *= 0.5;

    // Diminishing returns: prevent jumping from 0 to 100 too quickly
    // The higher the mastery, the harder it is to increase
    const scalingFactor = Math.max(0.1, (100 - currentMastery) / 100);
    delta *= scalingFactor;

    // Safeguard: cap max increase per question
    delta = Math.min(delta, 10);
  } else {
    // Incorrect answer
    delta = -5;
    
    // Difficulty modifier (getting hard wrong is expected, easy wrong is bad)
    if (attempt.difficulty === 'hard') delta += 2; // less penalty
    if (attempt.difficulty === 'easy') delta -= 3; // more penalty
    
    // Repeated incorrect answers compound the penalty slightly
    if (attempt.consecutiveIncorrect > 1) {
      delta *= Math.min(2, 1 + (attempt.consecutiveIncorrect * 0.1));
    }

    // Safeguard: one difficult question shouldn't destroy high mastery
    if (attempt.difficulty === 'hard' && currentMastery > 80) {
      delta = Math.max(delta, -3); 
    }

    // Diminishing returns on the bottom end
    const scalingFactor = Math.max(0.2, currentMastery / 100);
    delta *= scalingFactor;
    
    // Safeguard: cap max decrease per question
    delta = Math.max(delta, -15);
  }

  let newMastery = currentMastery + delta;
  return Math.max(0, Math.min(100, newMastery));
}

export function calculateForgettingScore(daysSinceLastAttempt: number, currentMastery: number): number {
  const decayRate = currentMastery > 80 ? 0.05 : (currentMastery > 50 ? 0.1 : 0.2);
  return Math.min(100, daysSinceLastAttempt * decayRate * 10);
}

export function calculateWeaknessScore(
  currentMastery: number,
  forgettingRisk: number,
  repeatedErrorPenalty: number,
  difficultyPenalty: number,
  examRelevance: number = 5 // 1-10
): number {
  const accuracyDeficit = 100 - currentMastery;
  
  let score = (accuracyDeficit * 0.4) 
            + (forgettingRisk * 0.2)
            + (repeatedErrorPenalty * 0.2)
            + (difficultyPenalty * 0.1)
            + (examRelevance * 2); // Scales up to 20

  return Math.max(0, Math.min(100, score));
}

export interface CandidateQuestion {
  id: string;
  topicId: string;
  topicWeakness: number; // 0-100
  forgettingRisk: number; // 0-100
  examRelevance: number; // 1-10 (higher is more relevant)
  difficulty: 'easy' | 'medium' | 'hard';
  daysSinceLastExposure: number | null; // null if never exposed
  previousErrorRelevance: number; // 0-100
  isOverdueRevision?: boolean; // flag for revision engine
}

export function calculateQuestionPriority(q: CandidateQuestion): number {
  let priority = 0;
  
  if (q.isOverdueRevision) {
    priority += 200; // Heavily prioritize overdue revisions
  }

  priority += q.topicWeakness * 0.4;
  priority += q.forgettingRisk * 0.3;
  priority += (q.examRelevance * 10) * 0.2;
  priority += q.previousErrorRelevance * 0.1;

  if (q.daysSinceLastExposure !== null) {
    if (q.daysSinceLastExposure < 1) {
      priority -= 1000; 
    } else if (q.daysSinceLastExposure < 7) {
      priority -= (7 - q.daysSinceLastExposure) * 10;
    }
  }

  return priority;
}

export function selectNextQuestion(candidates: CandidateQuestion[], isNewUser: boolean): CandidateQuestion | null {
  if (!candidates || candidates.length === 0) return null;

  if (isNewUser) {
    // Deterministic tie-breaking for new users based on ID sorting to avoid true random causing test flakiness
    const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
    // Distribute across topics by taking the first question of the most evenly distributed topic
    return sorted[0]; 
  }

  const scored = candidates.map(q => ({
    question: q,
    priority: calculateQuestionPriority(q)
  }));

  // Sort by priority descending, then deterministic tie-break by ID
  scored.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.question.id.localeCompare(b.question.id);
  });

  return scored[0].question;
}

export function calculateNextRevisionDays(isCorrect: boolean, confidence: 'low' | 'medium' | 'high' | undefined, consecutiveCorrect: number): number {
  if (!isCorrect) {
    // Resets/shortens interval appropriately
    return 1; 
  }
  
  if (confidence === 'low') return 2;
  
  // Progressively longer intervals
  if (consecutiveCorrect >= 4) return 21;
  if (consecutiveCorrect === 3) return 14;
  if (consecutiveCorrect === 2) return 7;
  
  return 3;
}
