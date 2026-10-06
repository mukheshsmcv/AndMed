export interface MissionConfig {
  dailyQuestionTarget: number;
  revisionTarget: number;
  weakAreaTarget: number;
  newQuestionTarget: number;
}

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  dailyQuestionTarget: 25,
  revisionTarget: 10,
  weakAreaTarget: 10,
  newQuestionTarget: 5
};

export interface MissionProgress {
  missionDate: string; // YYYY-MM-DD in UTC
  completedCount: number;
  completedRevisionCount: number;
  completedWeakAreaCount: number;
  completedNewCount: number;
}

export interface RecommendedAction {
  title: string;
  description: string;
  actionType: 'PRACTICE' | 'REVISION' | 'WEAK_AREA' | 'NEW' | 'COMPLETE';
  target?: string;
}

/**
 * Returns the current UTC date string YYYY-MM-DD
 */
export function getCurrentMissionDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generates the recommended dashboard action based on the day's progress and state.
 */
export function determineMissionAction(
  isNewUser: boolean,
  progress: MissionProgress,
  config: MissionConfig,
  overdueRevisionCount: number,
  weakTopicsExist: boolean
): RecommendedAction {
  
  if (isNewUser) {
    return {
      title: "Start Your First Mission",
      description: "Take 10 representative questions to establish your baseline.",
      actionType: 'NEW'
    };
  }

  // If daily target met
  if (progress.completedCount >= config.dailyQuestionTarget) {
    // Only continue if they still have overdue revisions
    if (overdueRevisionCount > 0) {
      return {
        title: `Clear ${overdueRevisionCount} Pending Revisions`,
        description: "You've met your daily goal, but spaced repetition is due.",
        actionType: 'REVISION'
      };
    }
    return {
      title: "Mission Complete",
      description: "You've crushed today's targets. Take a break or do a challenge.",
      actionType: 'COMPLETE'
    };
  }

  // Priority 1: Overdue Revisions
  if (overdueRevisionCount > 0 && progress.completedRevisionCount < config.revisionTarget) {
    return {
      title: `Clear ${overdueRevisionCount} Pending Revisions`,
      description: "Spaced repetition is due. Review these before learning new topics.",
      actionType: 'REVISION'
    };
  }

  // Priority 2: Weak Topics
  if (weakTopicsExist && progress.completedWeakAreaCount < config.weakAreaTarget) {
    return {
      title: "Strengthen Weak Areas",
      description: "Practice your weakest topics to improve mastery.",
      actionType: 'WEAK_AREA'
    };
  }

  // Priority 3 & 4: New / Normal Practice
  return {
    title: "Continue Today's Mission",
    description: `You've completed ${progress.completedCount}/${config.dailyQuestionTarget} questions today.`,
    actionType: 'PRACTICE'
  };
}
