import { 
  calculateTopicMastery, 
  calculateWeaknessScore,
  calculateQuestionPriority,
  selectNextQuestion,
  CandidateQuestion,
  calculateNextRevisionDays,
  AttemptResult
} from '../AdaptiveEngine';

describe('AdaptiveEngine v2', () => {
  
  const createAttempt = (overrides: Partial<AttemptResult>): AttemptResult => ({
    isCorrect: true,
    difficulty: 'medium',
    timeTaken: 30,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    ...overrides
  });

  describe('calculateTopicMastery', () => {
    it('increases mastery on correct answer (Test 3)', () => {
      const initial = 50;
      const result = calculateTopicMastery(initial, createAttempt({ isCorrect: true }));
      expect(result).toBeGreaterThan(initial);
    });

    it('decreases mastery on incorrect answer (Test 2)', () => {
      const initial = 50;
      const result = calculateTopicMastery(initial, createAttempt({ isCorrect: false }));
      expect(result).toBeLessThan(initial);
    });

    it('clamps mastery between 0 and 100', () => {
      expect(calculateTopicMastery(100, createAttempt({ isCorrect: true, difficulty: 'hard' }))).toBe(100);
      expect(calculateTopicMastery(0, createAttempt({ isCorrect: false, difficulty: 'easy' }))).toBe(0);
    });

    it('does not jump too quickly from 0 to 100', () => {
      const result = calculateTopicMastery(5, createAttempt({ isCorrect: true, difficulty: 'hard', confidence: 'high' }));
      expect(result).toBeLessThan(16); // max delta is 10
    });

    it('penalizes repeated incorrect answers more', () => {
      const baseFail = calculateTopicMastery(50, createAttempt({ isCorrect: false, consecutiveIncorrect: 0 }));
      const compoundFail = calculateTopicMastery(50, createAttempt({ isCorrect: false, consecutiveIncorrect: 3 }));
      expect(compoundFail).toBeLessThan(baseFail);
    });

    it('modifies learning signal based on confidence', () => {
      const highConf = calculateTopicMastery(50, createAttempt({ isCorrect: true, confidence: 'high' }));
      const lowConf = calculateTopicMastery(50, createAttempt({ isCorrect: true, confidence: 'low' }));
      expect(highConf).toBeGreaterThan(lowConf);
    });
  });

  describe('calculateWeaknessScore', () => {
    it('incorporates accuracy, forgetting, and repeated error penalty', () => {
      const s1 = calculateWeaknessScore(50, 0, 0, 0, 5);
      const s2 = calculateWeaknessScore(50, 20, 0, 0, 5);
      const s3 = calculateWeaknessScore(50, 20, 20, 0, 5);
      expect(s2).toBeGreaterThan(s1);
      expect(s3).toBeGreaterThan(s2);
    });
  });

  describe('selectNextQuestion', () => {
    const mockCandidates: CandidateQuestion[] = [
      { id: 'q1', topicId: 't1', topicWeakness: 20, forgettingRisk: 10, examRelevance: 5, difficulty: 'easy', daysSinceLastExposure: null, previousErrorRelevance: 0 },
      { id: 'q2', topicId: 't2', topicWeakness: 80, forgettingRisk: 50, examRelevance: 8, difficulty: 'medium', daysSinceLastExposure: null, previousErrorRelevance: 20 },
      { id: 'q3', topicId: 't3', topicWeakness: 90, forgettingRisk: 80, examRelevance: 9, difficulty: 'hard', daysSinceLastExposure: 0.1, previousErrorRelevance: 50 }, // Recently answered
      { id: 'q4', topicId: 't4', topicWeakness: 50, forgettingRisk: 20, examRelevance: 5, difficulty: 'medium', daysSinceLastExposure: null, previousErrorRelevance: 10, isOverdueRevision: true },
    ];

    it('selects balanced/random for new user (Test 1)', () => {
      const selected = selectNextQuestion(mockCandidates, true);
      // Deterministic tie-breaker should pick q1
      expect(selected?.id).toBe('q1');
    });

    it('selects high priority for old unanswered/weak topics (Test 4)', () => {
      // With q4 being an overdue revision, it might rank higher, so let's exclude q4 for this test
      const selected = selectNextQuestion(mockCandidates.slice(0, 3), false);
      expect(selected?.id).toBe('q2'); // q3 is penalized for recent exposure
    });

    it('overdue revisions outrank routine practice when appropriate', () => {
      const selected = selectNextQuestion(mockCandidates, false);
      expect(selected?.id).toBe('q4'); // overdue flag bumps it +200
    });

    it('reduces priority of recently answered questions (Test 5)', () => {
      const q3Priority = calculateQuestionPriority(mockCandidates[2]);
      expect(q3Priority).toBeLessThan(0); // Heavy penalty for < 1 day
    });

    it('is deterministic for same state (Test 6)', () => {
      const run1 = selectNextQuestion(mockCandidates, false);
      const run2 = selectNextQuestion(mockCandidates, false);
      expect(run1?.id).toBe(run2?.id);
    });
  });

  describe('calculateNextRevisionDays', () => {
    it('incorrect answers shorten/reset revision interval', () => {
      expect(calculateNextRevisionDays(false, undefined, 0)).toBe(1);
      // even if confidence is high and history was good, a fail resets it
      expect(calculateNextRevisionDays(false, 'high', 10)).toBe(1);
    });
    
    it('schedules for 2 days if correct but low confidence', () => {
      expect(calculateNextRevisionDays(true, 'low', 1)).toBe(2);
    });

    it('repeated correct answers lengthen revision interval', () => {
      expect(calculateNextRevisionDays(true, 'high', 2)).toBe(7);
      expect(calculateNextRevisionDays(true, 'high', 3)).toBe(14);
      expect(calculateNextRevisionDays(true, 'high', 4)).toBe(21);
    });
  });
});
