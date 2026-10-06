import {
  calculateReadinessScore,
  calculateSubjectMastery,
  identifyWeakAreas,
  calculateRevisionStats,
  determineNextAction,
  TopicMasteryRecord,
  RevisionRecord
} from '../DashboardEngine';

describe('DashboardEngine', () => {
  const mockMastery: TopicMasteryRecord[] = [
    { topic_id: 't1', topic_name: 'Topic 1', subject_id: 's1', subject_name: 'Subj 1', mastery_score: 40, questions_attempted: 10, correct_attempts: 4, last_attempted_at: '2023-01-01' },
    { topic_id: 't2', topic_name: 'Topic 2', subject_id: 's1', subject_name: 'Subj 1', mastery_score: 80, questions_attempted: 20, correct_attempts: 16, last_attempted_at: '2023-01-02' },
    { topic_id: 't3', topic_name: 'Topic 3', subject_id: 's2', subject_name: 'Subj 2', mastery_score: 50, questions_attempted: 0, correct_attempts: 0, last_attempted_at: null }
  ];

  it('calculates readiness score properly', () => {
    // Avg mastery: (40+80+50)/3 = 56.66
    // Total attempted: 30
    // Volume factor: (30/100)*100 = 30
    // Readiness = (56.66 * 0.7) + (30 * 0.3) = 39.66 + 9 = 48.66 => 49
    const readiness = calculateReadinessScore(mockMastery);
    expect(readiness).toBe(49);
  });

  it('ranks subjects by mastery', () => {
    const subjects = calculateSubjectMastery(mockMastery);
    expect(subjects.length).toBe(2);
    expect(subjects[0].id).toBe('s2'); // 50 avg < 60 avg
    expect(subjects[1].id).toBe('s1');
  });

  it('identifies weak areas', () => {
    const weak = identifyWeakAreas(mockMastery);
    expect(weak.length).toBe(2);
    expect(weak[0].topic_id).toBe('t1'); // score 40
    expect(weak[1].topic_id).toBe('t3'); // score 50
  });

  it('calculates revision stats', () => {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const future = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const revs: RevisionRecord[] = [
      { id: '1', scheduled_date: past, completed_at: null },
      { id: '2', scheduled_date: today, completed_at: null },
      { id: '3', scheduled_date: future, completed_at: null },
      { id: '4', scheduled_date: past, completed_at: '2023-01-01' }, // completed
    ];

    const stats = calculateRevisionStats(revs);
    expect(stats.overdue).toBe(1);
    expect(stats.dueToday).toBe(1);
    expect(stats.upcoming).toBe(1);
    expect(stats.totalDue).toBe(2);
  });

  it('determines next action correctly for new user', () => {
    const action = determineNextAction(true, { totalDue: 0 }, []);
    expect(action.title).toBe("Start Your First Practice");
  });

  it('prioritizes revisions in next action', () => {
    const action = determineNextAction(false, { totalDue: 5 }, [{ subject_name: 'Subj 1', topic_name: 'Topic 1' }]);
    expect(action.actionType).toBe('REVISION');
  });

  it('falls back to weak area in next action', () => {
    const action = determineNextAction(false, { totalDue: 0 }, [{ subject_name: 'Pathology', topic_name: 'Neoplasia' }]);
    expect(action.title).toContain('Pathology');
  });
});
