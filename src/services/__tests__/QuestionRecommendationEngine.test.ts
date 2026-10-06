import { selectNextQuestion, CandidateQuestion, StudentContext } from '../QuestionRecommendationEngine';
import { RecommendedAction } from '../DailyMissionEngine';

describe('QuestionRecommendationEngine', () => {
  const baseMission: RecommendedAction = { actionType: 'PRACTICE', title: '', description: '' };
  const mockCandidates: CandidateQuestion[] = [
    { id: 'q1', topicId: 't1', subjectId: 's1', difficulty: 'easy', examRelevance: 5, status: 'PUBLISHED' },
    { id: 'q2', topicId: 't2', subjectId: 's1', difficulty: 'medium', examRelevance: 8, status: 'PUBLISHED' },
    { id: 'q3', topicId: 't3', subjectId: 's2', difficulty: 'hard', examRelevance: 10, status: 'PUBLISHED' },
    { id: 'q4', topicId: 't1', subjectId: 's1', difficulty: 'medium', examRelevance: 5, status: 'RETIRED' }
  ];

  const emptyContext: StudentContext = {
    missionAction: baseMission,
    topicClassifications: {},
    topicMasteryScores: {},
    overdueRevisionQuestionIds: new Set(),
    recentlyAttemptedIds: {},
    confidenceData: {}
  };

  it('filters out unpublished questions', () => {
    const nextQ = selectNextQuestion(mockCandidates, emptyContext);
    expect(nextQ?.id).not.toBe('q4');
  });

  it('filters out questions attempted < 1 day ago unless revision', () => {
    const context = {
      ...emptyContext,
      recentlyAttemptedIds: { 'q1': { daysSince: 0.5, isCorrect: true }, 'q2': { daysSince: 2, isCorrect: false } }
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    expect(nextQ?.id).toBe('q3'); // q3 has highest exam relevance among remaining (q2, q3)
    
    // Test revision bypass
    context.overdueRevisionQuestionIds = new Set(['q1']);
    context.missionAction = { actionType: 'REVISION', title: '', description: '' } as RecommendedAction;
    const nextQWithRev = selectNextQuestion(mockCandidates, context);
    expect(nextQWithRev?.id).toBe('q1');
  });

  it('prioritizes overdue revisions when mission is REVISION', () => {
    const context = {
      ...emptyContext,
      missionAction: { actionType: 'REVISION', title: '', description: '' } as RecommendedAction,
      overdueRevisionQuestionIds: new Set(['q2'])
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    expect(nextQ?.id).toBe('q2');
  });

  it('targets weaknesses when mission is WEAK_AREA', () => {
    const context = {
      ...emptyContext,
      missionAction: { actionType: 'WEAK_AREA', title: '', description: '' } as RecommendedAction,
      topicClassifications: { 't1': 'CRITICAL_WEAKNESS' } as any
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    expect(nextQ?.id).toBe('q1'); // Even though q3 has higher relevance, q1 is a critical weakness
  });

  it('distributes difficulty appropriately based on mastery', () => {
    // Medium mastery should prefer medium/hard
    const context = {
      ...emptyContext,
      topicMasteryScores: { 't1': 60, 't2': 60, 't3': 60 }
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    // q3 (hard) and q2 (medium) are preferred. q3 has higher exam relevance (10) vs q2 (8).
    // Medium mastery: medium gets +15, hard gets +5.
    // q2 score: 16 (relevance) + 15 (diff) = 31
    // q3 score: 20 (relevance) + 5 (diff) = 25
    expect(nextQ?.id).toBe('q2');
  });

  it('deterministically breaks ties using ID', () => {
    const tieCandidates: CandidateQuestion[] = [
      { id: 'qB', topicId: 't1', subjectId: 's1', difficulty: 'medium', examRelevance: 5, status: 'PUBLISHED' },
      { id: 'qA', topicId: 't1', subjectId: 's1', difficulty: 'medium', examRelevance: 5, status: 'PUBLISHED' }
    ];
    const nextQ = selectNextQuestion(tieCandidates, emptyContext);
    expect(nextQ?.id).toBe('qA');
  });

  it('filters based on practice mode UNATTEMPTED', () => {
    const context = {
      ...emptyContext,
      practiceMode: 'UNATTEMPTED',
      recentlyAttemptedIds: { 'q1': { daysSince: 5, isCorrect: true } }
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    expect(nextQ?.id).not.toBe('q1');
  });

  it('filters based on practice mode INCORRECT', () => {
    const context = {
      ...emptyContext,
      practiceMode: 'INCORRECT',
      recentlyAttemptedIds: { 'q1': { daysSince: 5, isCorrect: true }, 'q2': { daysSince: 5, isCorrect: false } }
    };
    const nextQ = selectNextQuestion(mockCandidates, context);
    expect(nextQ?.id).toBe('q2');
  });
});
