import { deriveCurriculumStatus, calculateCompletionPercentage, calculateIntegratedMastery, IntegratedComponent } from '../CurriculumEngine';

describe('CurriculumEngine', () => {
  describe('deriveCurriculumStatus', () => {
    it('returns NOT_STARTED for 0 questions', () => {
      expect(deriveCurriculumStatus({ questionsAttempted: 0, masteryScore: 0, hasOverdueRevision: false })).toBe('NOT_STARTED');
    });

    it('returns NEEDS_REVISION if overdue, regardless of attempts', () => {
      expect(deriveCurriculumStatus({ questionsAttempted: 50, masteryScore: 90, hasOverdueRevision: true })).toBe('NEEDS_REVISION');
    });

    it('returns IN_PROGRESS for < 5 questions', () => {
      expect(deriveCurriculumStatus({ questionsAttempted: 3, masteryScore: 100, hasOverdueRevision: false })).toBe('IN_PROGRESS');
    });

    it('returns STUDIED for >= 5 questions and < 75 mastery', () => {
      expect(deriveCurriculumStatus({ questionsAttempted: 10, masteryScore: 70, hasOverdueRevision: false })).toBe('STUDIED');
      expect(deriveCurriculumStatus({ questionsAttempted: 20, masteryScore: 60, hasOverdueRevision: false })).toBe('STUDIED'); // < 75 mastery
    });

    it('returns MASTERED for >= 15 questions and >= 75 mastery', () => {
      expect(deriveCurriculumStatus({ questionsAttempted: 15, masteryScore: 75, hasOverdueRevision: false })).toBe('MASTERED');
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('returns 0 if 0 questions', () => {
      expect(calculateCompletionPercentage(100, 0)).toBe(0);
    });

    it('scales mastery by volume factor', () => {
      expect(calculateCompletionPercentage(80, 10)).toBe(40); // 80 * (10/20)
      expect(calculateCompletionPercentage(80, 20)).toBe(80); // 80 * (20/20)
      expect(calculateCompletionPercentage(80, 50)).toBe(80); // max volume factor is 1
    });
  });

  describe('calculateIntegratedMastery', () => {
    it('returns INSUFFICIENT_DATA if no components', () => {
      expect(calculateIntegratedMastery([])).toBe('INSUFFICIENT_DATA');
    });

    it('returns INSUFFICIENT_DATA if < 10 total attempts', () => {
      const components: IntegratedComponent[] = [
        { topicId: '1', masteryScore: 80, questionsAttempted: 5, importance: 5 },
        { topicId: '2', masteryScore: 90, questionsAttempted: 4, importance: 5 }
      ];
      expect(calculateIntegratedMastery(components)).toBe('INSUFFICIENT_DATA');
    });

    it('calculates weighted average for sufficient data', () => {
      const components: IntegratedComponent[] = [
        { topicId: '1', masteryScore: 100, questionsAttempted: 10, importance: 10 },
        { topicId: '2', masteryScore: 0, questionsAttempted: 5, importance: 5 }
      ];
      // Total attempts = 15 (sufficient)
      // Weighted sum: 100*10 + 0*5 = 1000
      // Total weight: 15
      // 1000 / 15 = 66.66 -> 67
      expect(calculateIntegratedMastery(components)).toBe(67);
    });
  });
});
