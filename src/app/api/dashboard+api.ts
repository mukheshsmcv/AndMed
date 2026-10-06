import { supabaseServer } from '../../lib/supabase-server';
import { 
  calculateReadinessScore, 
  calculateSubjectMastery, 
  identifyWeakAreas, 
  calculateRevisionStats, 
  determineNextAction,
  calculatePerformanceStats
} from '../../services/DashboardEngine';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Mastery Records
    const { data: masteryRecords, error: masteryError } = await supabaseServer
      .from('topic_mastery')
      .select(`
        topic_id,
        mastery_score,
        questions_attempted,
        correct_attempts,
        last_attempted_at,
        topics (
          name,
          subjects (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id);

    if (masteryError) throw new Error('Error fetching mastery');

    const mappedMastery = (masteryRecords || []).map((r: any) => ({
      topic_id: r.topic_id,
      topic_name: r.topics?.name || 'Unknown',
      subject_id: r.topics?.subjects?.id || 'Unknown',
      subject_name: r.topics?.subjects?.name || 'Unknown',
      mastery_score: r.mastery_score,
      questions_attempted: r.questions_attempted,
      correct_attempts: r.correct_attempts,
      last_attempted_at: r.last_attempted_at
    }));

    // 2. Fetch Revision Stats
    const { data: revisions } = await supabaseServer
      .from('revision_items')
      .select('id, scheduled_date, completed_at')
      .eq('user_id', user.id);

    // 3. Fetch Recent Attempts for Performance Stats
    // For MVP, just get the last 7 days of attempts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: attempts } = await supabaseServer
      .from('question_attempts')
      .select('created_at, is_correct')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    // 4. Run through Dashboard Engine
    const isNewUser = mappedMastery.length === 0 && (!attempts || attempts.length === 0);
    
    const readiness = calculateReadinessScore(mappedMastery);
    const subjects = calculateSubjectMastery(mappedMastery);
    const weakAreas = identifyWeakAreas(mappedMastery);
    const revisionStats = calculateRevisionStats(revisions || []);
    const performanceStats = calculatePerformanceStats(attempts || []);
    const nextAction = determineNextAction(isNewUser, revisionStats, weakAreas);

    return Response.json({
      isNewUser,
      readiness,
      subjects,
      weakAreas,
      revisionStats,
      performanceStats,
      nextAction
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
