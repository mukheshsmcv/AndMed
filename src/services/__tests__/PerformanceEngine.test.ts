import { classifyTopic, classifyTrend, classifyConfidence } from '../PerformanceEngine';

describe('PerformanceEngine', () => {
  describe('classifyTopic', () => {
    it('returns KNOWLEDGE_GAP for tiny samples', () => {
      expect(classifyTopic(4, 0.2, 20)).toBe('KNOWLEDGE_GAP');
    });

    it('returns CRITICAL_WEAKNESS for large sample with low mastery', () => {
      expect(classifyTopic(15, 0.3, 25)).toBe('CRITICAL_WEAKNESS');
    });

    it('returns EMERGING_WEAKNESS for medium sample with low mastery', () => {
      expect(classifyTopic(7, 0.3, 25)).toBe('EMERGING_WEAKNESS');
    });

    it('returns STRONG_AREA for high mastery and accuracy', () => {
      expect(classifyTopic(20, 0.8, 85)).toBe('STRONG_AREA');
    });

    it('returns NORMAL otherwise', () => {
      expect(classifyTopic(10, 0.6, 60)).toBe('NORMAL');
    });
  });

  describe('classifyTrend', () => {
    it('returns INSUFFICIENT_DATA for small samples', () => {
      expect(classifyTrend(5, 0.5, 25, 0.5)).toBe('INSUFFICIENT_DATA');
      expect(classifyTrend(15, 0.5, 10, 0.5)).toBe('INSUFFICIENT_DATA');
    });

    it('returns IMPROVING for significant positive difference', () => {
      expect(classifyTrend(15, 0.7, 25, 0.6)).toBe('IMPROVING');
    });

    it('returns DECLINING for significant negative difference', () => {
      expect(classifyTrend(15, 0.4, 25, 0.5)).toBe('DECLINING');
    });

    it('returns STABLE for minor difference', () => {
      expect(classifyTrend(15, 0.52, 25, 0.5)).toBe('STABLE');
    });
  });

  describe('classifyConfidence', () => {
    it('returns INSUFFICIENT_DATA for total < 15', () => {
      expect(classifyConfidence({ highConfCorrect: 5, highConfIncorrect: 5, lowConfCorrect: 2, lowConfIncorrect: 2 })).toBe('INSUFFICIENT_DATA');
    });

    it('returns OVERCONFIDENT when high conf is frequently incorrect', () => {
      expect(classifyConfidence({ highConfCorrect: 1, highConfIncorrect: 5, lowConfCorrect: 10, lowConfIncorrect: 10 })).toBe('OVERCONFIDENT');
    });

    it('returns UNDERCONFIDENT when low conf is frequently correct', () => {
      expect(classifyConfidence({ highConfCorrect: 10, highConfIncorrect: 5, lowConfCorrect: 9, lowConfIncorrect: 1 })).toBe('UNDERCONFIDENT');
    });

    it('returns WELL_CALIBRATED otherwise', () => {
      expect(classifyConfidence({ highConfCorrect: 10, highConfIncorrect: 2, lowConfCorrect: 2, lowConfIncorrect: 10 })).toBe('WELL_CALIBRATED');
    });
  });
});
