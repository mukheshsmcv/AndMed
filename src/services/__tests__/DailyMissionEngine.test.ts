import {
  getCurrentMissionDate,
  determineMissionAction,
  DEFAULT_MISSION_CONFIG,
  MissionProgress
} from '../DailyMissionEngine';

describe('DailyMissionEngine', () => {
  const mockProgress: MissionProgress = {
    missionDate: '2023-10-10',
    completedCount: 0,
    completedRevisionCount: 0,
    completedWeakAreaCount: 0,
    completedNewCount: 0
  };

  it('determines the correct UTC mission date format', () => {
    const date = getCurrentMissionDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('gives new users a baseline mission', () => {
    const action = determineMissionAction(true, mockProgress, DEFAULT_MISSION_CONFIG, 0, false);
    expect(action.actionType).toBe('NEW');
    expect(action.title).toBe('Start Your First Mission');
  });

  it('prioritizes overdue revisions first', () => {
    const action = determineMissionAction(false, mockProgress, DEFAULT_MISSION_CONFIG, 5, true);
    expect(action.actionType).toBe('REVISION');
  });

  it('prioritizes weak areas when no overdue revisions', () => {
    const action = determineMissionAction(false, mockProgress, DEFAULT_MISSION_CONFIG, 0, true);
    expect(action.actionType).toBe('WEAK_AREA');
  });

  it('defaults to normal practice when no revisions or weak areas', () => {
    const action = determineMissionAction(false, mockProgress, DEFAULT_MISSION_CONFIG, 0, false);
    expect(action.actionType).toBe('PRACTICE');
  });

  it('marks mission complete when daily target is met without overdue revisions', () => {
    const progress = { ...mockProgress, completedCount: 25 };
    const action = determineMissionAction(false, progress, DEFAULT_MISSION_CONFIG, 0, false);
    expect(action.actionType).toBe('COMPLETE');
  });

  it('forces revisions even if daily target is met if they are overdue', () => {
    const progress = { ...mockProgress, completedCount: 30 };
    const action = determineMissionAction(false, progress, DEFAULT_MISSION_CONFIG, 2, false);
    expect(action.actionType).toBe('REVISION');
    expect(action.title).toContain('Clear 2 Pending');
  });
});
