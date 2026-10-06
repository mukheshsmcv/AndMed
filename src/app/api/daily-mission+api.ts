import { supabaseServer } from '../../lib/supabase-server';
import { 
  getCurrentMissionDate, 
  DEFAULT_MISSION_CONFIG, 
  determineMissionAction, 
  MissionProgress 
} from '../../services/DailyMissionEngine';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missionDate = getCurrentMissionDate();

    // 1. Calculate today's attempts dynamically (no need for duplicate state tables for MVP)
    const { data: todaysAttempts, error: attemptError } = await supabaseServer
      .from('question_attempts')
      .select('id, is_correct')
      .eq('user_id', user.id)
      .gte('created_at', `${missionDate}T00:00:00.000Z`)
      .lte('created_at', `${missionDate}T23:59:59.999Z`);

    if (attemptError) throw new Error('Error fetching attempts');

    const completedCount = todaysAttempts?.length || 0;
    
    // For MVP, we'll estimate breakdown simply. (In production, we'd join on question to see if it was a revision/weak area attempt)
    // To avoid massive query overhead, we assume normal distribution or just aggregate total count.
    const progress: MissionProgress = {
      missionDate,
      completedCount,
      completedRevisionCount: Math.floor(completedCount * 0.3), // Mock
      completedWeakAreaCount: Math.floor(completedCount * 0.3), // Mock
      completedNewCount: Math.floor(completedCount * 0.4) // Mock
    };

    // 2. Fetch Overdue Revisions
    const { count: overdueRevisionCount } = await supabaseServer
      .from('revision_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('completed_at', null)
      .lte('scheduled_date', missionDate);

    // 3. Fetch Weak Topics
    const { count: weakTopicCount } = await supabaseServer
      .from('topic_mastery')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('mastery_score', 60);

    const isNewUser = completedCount === 0 && (!weakTopicCount || weakTopicCount === 0);

    // 4. Generate Action
    const nextAction = determineMissionAction(
      isNewUser, 
      progress, 
      DEFAULT_MISSION_CONFIG, 
      overdueRevisionCount || 0, 
      (weakTopicCount || 0) > 0
    );

    return Response.json({
      missionDate,
      progress,
      target: DEFAULT_MISSION_CONFIG,
      nextAction,
      remaining: Math.max(0, DEFAULT_MISSION_CONFIG.dailyQuestionTarget - completedCount)
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
