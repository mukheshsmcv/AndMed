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

    // 4. Fetch Study Sessions for Streak & Today
    const { data: sessions } = await supabaseServer
      .from('student_topic_sessions')
      .select('started_at, duration_seconds, status, topic_id')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 60)
      .order('started_at', { ascending: false });

    // Calculate Streak & Today's Study
    let todayStudySeconds = 0;
    let currentStreak = 0;
    let mostRecentTopicId = sessions && sessions.length > 0 ? sessions[0].topic_id : null;
    
    if (sessions && sessions.length > 0) {
      // Create a Set of normalized local date strings (YYYY-MM-DD)
      const studyDays = new Set<string>();
      sessions.forEach(s => {
        const d = new Date(s.started_at);
        // Use local time for the calendar day
        const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        studyDays.add(dayStr);
        
        // Is it today?
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        if (dayStr === todayStr) {
          todayStudySeconds += (s.duration_seconds || 0);
        }
      });

      // Calculate streak walking backwards from today
      const today = new Date();
      let checkDate = new Date(today);
      let streakActive = true;
      let dayCounter = 0;

      while (streakActive) {
        const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
        if (studyDays.has(checkStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          dayCounter++;
        } else {
          // If checking today and it's missing, it's fine (they haven't studied yet today), 
          // but we still check yesterday.
          if (dayCounter === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            dayCounter++;
          } else {
            streakActive = false;
          }
        }
      }
    }

    // Run through Dashboard Engine
    const isNewUser = mappedMastery.length === 0 && (!attempts || attempts.length === 0);
    
    const readiness = calculateReadinessScore(mappedMastery);
    const subjects = calculateSubjectMastery(mappedMastery);
    const weakAreas = identifyWeakAreas(mappedMastery);
    const revisionStats = calculateRevisionStats(revisions || []);
    const performanceStats = calculatePerformanceStats(attempts || []);
    const nextAction = determineNextAction(isNewUser, revisionStats, weakAreas);

    let recentTopicDetails = null;
    if (mostRecentTopicId) {
      const { data: rt } = await supabaseServer
        .from('topics')
        .select('id, name, subjects(name)')
        .eq('id', mostRecentTopicId)
        .single();
      if (rt) {
        const subj: any = rt.subjects;
        recentTopicDetails = {
          id: rt.id,
          name: rt.name,
          subjectName: Array.isArray(subj) ? subj[0]?.name : subj?.name
        };
      }
    }

    // 5. Fetch Topic Revisions (M17)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: topicRevisions } = await supabaseServer
      .from('student_topic_revisions')
      .select('id, topic_id, scheduled_for, status, interval_days, topics(id, name, subjects(name))')
      .eq('user_id', user.id)
      .in('status', ['SCHEDULED', 'OVERDUE']);
      
    // Determine which are overdue vs due today
    let activeRevisions: any[] = [];
    if (topicRevisions) {
      activeRevisions = topicRevisions.map((r: any) => {
        const isOverdue = r.scheduled_for < todayStr;
        const isDueToday = r.scheduled_for === todayStr;
        const subjectData: any = Array.isArray(r.topics?.subjects) ? r.topics?.subjects[0] : r.topics?.subjects;
        return {
          id: r.id,
          topicId: r.topic_id,
          topicName: r.topics?.name,
          subjectName: subjectData?.name,
          scheduledFor: r.scheduled_for,
          status: isOverdue ? 'OVERDUE' : (isDueToday ? 'DUE_TODAY' : r.status)
        };
      }).filter((r: any) => r.status === 'OVERDUE' || r.status === 'DUE_TODAY');
      
      // Sort by overdue first, then by scheduled date
      activeRevisions.sort((a: any, b: any) => {
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      });
    }

    return Response.json({
      isNewUser,
      readiness,
      subjects,
      weakAreas,
      revisionStats,
      performanceStats,
      nextAction,
      activeRevisions,
      studyStats: {
        todayStudySeconds,
        currentStreak,
        recentTopicDetails
      }
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
