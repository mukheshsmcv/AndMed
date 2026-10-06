export interface TopicMasteryRecord {
  topic_id: string;
  topic_name: string;
  subject_id: string;
  subject_name: string;
  mastery_score: number;
  questions_attempted: number;
  correct_attempts: number;
  last_attempted_at: string | null;
}

export interface RevisionRecord {
  id: string;
  scheduled_date: string;
  completed_at: string | null;
}

export interface AttemptRecord {
  created_at: string;
  is_correct: boolean;
}

/**
 * Deterministic readiness score (0-100).
 * Based on aggregated mastery scores and volume of practice.
 * Formula: (Average Mastery * 0.7) + (Practice Volume Factor * 0.3)
 */
export function calculateReadinessScore(masteryRecords: TopicMasteryRecord[], totalQuestionsAvailable: number = 1000): number {
  if (masteryRecords.length === 0) return 0;

  const totalMastery = masteryRecords.reduce((sum, rec) => sum + rec.mastery_score, 0);
  const avgMastery = totalMastery / masteryRecords.length;

  const totalAttempted = masteryRecords.reduce((sum, rec) => sum + rec.questions_attempted, 0);
  // Cap the volume factor at 100 once they've attempted roughly 30% of questions or a set threshold.
  // For MVP, say 100 questions = max volume score.
  const volumeFactor = Math.min(100, (totalAttempted / 100) * 100);

  const readiness = (avgMastery * 0.7) + (volumeFactor * 0.3);
  
  return Math.min(100, Math.round(readiness));
}

/**
 * Group topics by subject and calculate subject mastery.
 */
export function calculateSubjectMastery(masteryRecords: TopicMasteryRecord[]) {
  const subjectMap = new Map<string, any>();

  for (const rec of masteryRecords) {
    if (!subjectMap.has(rec.subject_id)) {
      subjectMap.set(rec.subject_id, {
        id: rec.subject_id,
        name: rec.subject_name,
        totalMastery: 0,
        topicCount: 0,
        questionsAttempted: 0,
        correctAttempts: 0
      });
    }
    const subj = subjectMap.get(rec.subject_id);
    subj.totalMastery += rec.mastery_score;
    subj.topicCount += 1;
    subj.questionsAttempted += rec.questions_attempted;
    subj.correctAttempts += rec.correct_attempts;
  }

  const subjects = Array.from(subjectMap.values()).map(s => {
    return {
      id: s.id,
      name: s.name,
      masteryPercentage: s.topicCount > 0 ? Math.round(s.totalMastery / s.topicCount) : 0,
      questionsAttempted: s.questionsAttempted,
      accuracy: s.questionsAttempted > 0 ? Math.round((s.correctAttempts / s.questionsAttempted) * 100) : 0
    };
  });

  // Sort weak subjects toward the top (lowest mastery first)
  return subjects.sort((a, b) => a.masteryPercentage - b.masteryPercentage);
}

/**
 * Identify highest-priority weak areas.
 */
export function identifyWeakAreas(masteryRecords: TopicMasteryRecord[]) {
  // Filter for topics with mastery < 60, sort lowest first
  const weak = masteryRecords.filter(r => r.mastery_score < 60);
  weak.sort((a, b) => a.mastery_score - b.mastery_score);
  return weak.slice(0, 3).map(w => ({
    topic_id: w.topic_id,
    topic_name: w.topic_name,
    subject_name: w.subject_name,
    mastery_score: Math.round(w.mastery_score),
    reason: w.questions_attempted === 0 ? 'Not Started' : 'Needs Practice'
  }));
}

/**
 * Process revision dates.
 */
export function calculateRevisionStats(revisions: RevisionRecord[]) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  let dueToday = 0;
  let overdue = 0;
  let upcoming = 0;

  for (const rev of revisions) {
    if (rev.completed_at) continue;

    if (rev.scheduled_date < todayStr) {
      overdue++;
    } else if (rev.scheduled_date === todayStr) {
      dueToday++;
    } else {
      upcoming++;
    }
  }

  return { dueToday, overdue, upcoming, totalDue: dueToday + overdue };
}

/**
 * Determine the recommended next action.
 */
export function determineNextAction(
  isNewUser: boolean, 
  revisionStats: { totalDue: number }, 
  weakAreas: any[]
) {
  if (isNewUser) {
    return {
      title: "Start Your First Practice",
      description: "Take a mixed quiz to establish your baseline.",
      actionType: 'PRACTICE',
      target: 'MIXED'
    };
  }

  if (revisionStats.totalDue > 0) {
    return {
      title: `Clear ${revisionStats.totalDue} Pending Revisions`,
      description: "Spaced repetition is due. Review these before learning new topics.",
      actionType: 'REVISION',
      target: 'DUE'
    };
  }

  if (weakAreas.length > 0) {
    const weakest = weakAreas[0];
    return {
      title: `Strengthen ${weakest.subject_name}`,
      description: `Practice ${weakest.topic_name} to improve your mastery.`,
      actionType: 'PRACTICE',
      target: weakest.topic_id
    };
  }

  return {
    title: "Continue Daily Mission",
    description: "Keep up the momentum with general practice.",
    actionType: 'PRACTICE',
    target: 'MIXED'
  };
}

/**
 * Calculate performance metrics from attempts
 */
export function calculatePerformanceStats(attempts: AttemptRecord[]) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  let questionsToday = 0;
  let correctToday = 0;
  
  for (const att of attempts) {
    const attDate = att.created_at.split('T')[0];
    if (attDate === todayStr) {
      questionsToday++;
      if (att.is_correct) correctToday++;
    }
  }

  return {
    questionsToday,
    accuracyToday: questionsToday > 0 ? Math.round((correctToday / questionsToday) * 100) : 0,
    questionsThisWeek: attempts.length, // Assuming attempts array passed is filtered for 7 days
    accuracyThisWeek: attempts.length > 0 ? Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100) : 0
  };
}
