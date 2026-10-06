import { calculateTopicMastery, AttemptResult } from '../../../services/AdaptiveEngine';
import { calculateReadinessScore, calculateSubjectMastery, identifyWeakAreas, determineNextAction } from '../../../services/DashboardEngine';

describe('End-to-End Learning Loop (Integration)', () => {
  it('successfully transitions from new user to adaptive state', () => {
    // 1. New User State
    const masteryRecords: any[] = [];
    let isNewUser = true;
    const revisionStats = { totalDue: 0, overdue: 0, dueToday: 0, upcoming: 0 };
    
    // Check dashboard action
    const dashboardAction = determineNextAction(isNewUser, revisionStats, []);
    expect(dashboardAction.title).toBe('Start Your First Practice');
    
    // 2. User fetches next question (simulate Baseline distribution)
    // - Handled by next-question+api.ts via selectNextQuestion with isNewUser=true
    
    // 3. User submits an attempt (simulating API logic)
    const attempt1: AttemptResult = {
      isCorrect: true,
      difficulty: 'medium',
      timeTaken: 20,
      confidence: 'medium',
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0
    };
    const newMastery = calculateTopicMastery(50, attempt1);
    expect(newMastery).toBe(52.5); // 50 + (5 * 0.5) scaling
    
    // Update state
    masteryRecords.push({
      topic_id: 't1',
      topic_name: 'Topic 1',
      subject_id: 's1',
      subject_name: 'Subj 1',
      mastery_score: newMastery,
      questions_attempted: 1,
      correct_attempts: 1,
      last_attempted_at: new Date().toISOString()
    });
    isNewUser = false;
    
    // 4. User fetches dashboard again
    const subjects = calculateSubjectMastery(masteryRecords);
    const weakAreas = identifyWeakAreas(masteryRecords);
    
    // Weak areas identify topics < 60
    expect(weakAreas.length).toBe(1);
    expect(weakAreas[0].topic_id).toBe('t1');
    
    // 5. Check dashboard action again
    const action2 = determineNextAction(isNewUser, revisionStats, weakAreas);
    expect(action2.title).toContain('Strengthen Subj 1');
    
    // 6. User answers incorrectly (repeated error)
    const attempt2: AttemptResult = {
      isCorrect: false,
      difficulty: 'easy',
      timeTaken: 10,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 1
    };
    const updatedMastery = calculateTopicMastery(newMastery, attempt2);
    expect(updatedMastery).toBeLessThan(newMastery);
    
    masteryRecords[0].mastery_score = updatedMastery;
    masteryRecords[0].questions_attempted = 2;
    masteryRecords[0].correct_attempts = 1;
    
    // 7. Verify dashboard logic updates
    const updatedWeakAreas = identifyWeakAreas(masteryRecords);
    expect(updatedWeakAreas[0].mastery_score).toBeLessThan(55);
  });
});
