import { TopicClassification } from './PerformanceEngine';
import { RecommendedAction } from './DailyMissionEngine';

export interface CandidateQuestion {
  id: string;
  topicId: string;
  subjectId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examRelevance: number; // 1-10
  status: string;
}

export interface StudentContext {
  missionAction: RecommendedAction;
  topicClassifications: Record<string, TopicClassification>;
  topicMasteryScores: Record<string, number>;
  overdueRevisionQuestionIds: Set<string>;
  recentlyAttemptedIds: Record<string, { daysSince: number, isCorrect?: boolean }>; // Question ID -> Attempt Data
  confidenceData: Record<string, 'OVERCONFIDENT' | 'UNDERCONFIDENT' | 'WELL_CALIBRATED' | 'INSUFFICIENT_DATA'>;
  practiceMode?: string | null; // e.g. TOPIC, SUBJECT, WEAK_AREA, UNATTEMPTED, INCORRECT, REVISION
}

export interface RecommendationScore {
  questionId: string;
  tier: number; // Lower is higher priority (0: Revision, 1: Weakness, 2: Normal)
  score: number;
}

/**
 * M11: Intelligent Question Delivery Engine
 * Deterministic recommendation pipeline.
 */
export function selectNextQuestion(candidates: CandidateQuestion[], context: StudentContext): CandidateQuestion | null {
  // 1. Candidate Filtering
  const eligible = candidates.filter(q => {
    if (q.status !== 'PUBLISHED') return false;
    
    const attemptData = context.recentlyAttemptedIds[q.id];
    
    // Mode-specific Hard Filters
    if (context.practiceMode === 'UNATTEMPTED' && attemptData !== undefined) return false;
    if (context.practiceMode === 'INCORRECT' && (attemptData === undefined || attemptData.isCorrect === true)) return false;
    if (context.practiceMode === 'REVISION' && !context.overdueRevisionQuestionIds.has(q.id)) return false;
    if (context.practiceMode === 'WEAK_AREA') {
      const cls = context.topicClassifications[q.topicId];
      if (cls !== 'CRITICAL_WEAKNESS' && cls !== 'EMERGING_WEAKNESS') return false;
    }

    // Hard repetition filter: block if answered < 1 day ago unless it's a revision or specific mode overrides
    if (attemptData !== undefined && attemptData.daysSince < 1 && !context.overdueRevisionQuestionIds.has(q.id) && context.practiceMode !== 'INCORRECT') {
      return false;
    }
    
    return true;
  });

  if (eligible.length === 0) return null;

  // Cold Start Detection
  const isColdStart = Object.keys(context.topicMasteryScores).length === 0;

  // 2. Candidate Scoring & Tiering
  const scoredCandidates: (CandidateQuestion & RecommendationScore)[] = eligible.map(q => {
    let tier = 2; // NORMAL
    let score = 0;

    // A. Priority Tiering (M9 Mission Awareness)
    const isRevision = context.overdueRevisionQuestionIds.has(q.id);
    const classification = context.topicClassifications[q.topicId] || 'NORMAL';
    
    if (context.missionAction.actionType === 'REVISION' && isRevision) {
      tier = 0; // REVISION TIER
    } else if (context.missionAction.actionType === 'WEAK_AREA' && (classification === 'CRITICAL_WEAKNESS' || classification === 'EMERGING_WEAKNESS')) {
      tier = 1; // WEAKNESS TIER
    } else {
      // Standard fallback tiers if mission allows
      if (isRevision) tier = 0;
      else if (classification === 'CRITICAL_WEAKNESS') tier = 1;
    }

    // B. Base Scoring (Exam Relevance)
    score += (q.examRelevance * 2); // max 20

    // C. Mastery-Aware Difficulty Match
    const mastery = context.topicMasteryScores[q.topicId] ?? 0;
    
    if (isColdStart) {
      if (q.difficulty === 'easy') score += 10;
      if (q.difficulty === 'medium') score += 5;
    } else {
      if (mastery < 40) {
        if (q.difficulty === 'easy') score += 15;
        if (q.difficulty === 'medium') score += 5;
      } else if (mastery < 75) {
        if (q.difficulty === 'medium') score += 15;
        if (q.difficulty === 'hard') score += 5;
      } else {
        if (q.difficulty === 'hard') score += 15;
        if (q.difficulty === 'medium') score += 5;
      }
    }

    // D. Diversity / Repetition Penalty
    const attemptData = context.recentlyAttemptedIds[q.id];
    if (attemptData !== undefined) {
      if (attemptData.daysSince < 7) score -= (7 - attemptData.daysSince) * 2; // slight penalty for recent exposure
    }

    // E. Weakness Targeting
    if (classification === 'CRITICAL_WEAKNESS') score += 15;
    if (classification === 'EMERGING_WEAKNESS') score += 10;
    if (classification === 'KNOWLEDGE_GAP') score += 5;
    if (classification === 'STRONG_AREA') score -= 5; // Diversity maintenance

    return { ...q, questionId: q.id, tier, score };
  });

  // 3. Deterministic Selection (Tie-Breakers)
  scoredCandidates.sort((a, b) => {
    // 1. Higher priority tier
    if (a.tier !== b.tier) return a.tier - b.tier;
    
    // 2. Higher recommendation score
    if (a.score !== b.score) return b.score - a.score;
    
    // 3. Higher exam relevance
    if (a.examRelevance !== b.examRelevance) return b.examRelevance - a.examRelevance;
    
    // 4. Stable question ID ordering
    return a.id.localeCompare(b.id);
  });

  return scoredCandidates[0];
}
