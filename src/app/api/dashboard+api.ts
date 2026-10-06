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

    // 2. Fetch Question-Level Revision Stats (dormant/legacy)
    const { data: revisions } = await supabaseServer
      .from('revision_items')
      .select('id, scheduled_date, completed_at')
      .eq('user_id', user.id);

    // 3. Fetch Recent Attempts for Performance Stats & Subject MCQ Accuracy
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentAttempts } = await supabaseServer
      .from('question_attempts')
      .select('created_at, is_correct')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Fetch all user question attempts mapped to question subject for accurate subject accuracy
    const { data: allUserAttempts } = await supabaseServer
      .from('question_attempts')
      .select('is_correct, questions(subject_id)')
      .eq('user_id', user.id);

    const subjectAttemptsMap = new Map<string, { total: number; correct: number }>();
    if (allUserAttempts) {
      allUserAttempts.forEach((att: any) => {
        const sId = att.questions?.subject_id;
        if (sId) {
          const cur = subjectAttemptsMap.get(sId) || { total: 0, correct: 0 };
          cur.total += 1;
          if (att.is_correct) cur.correct += 1;
          subjectAttemptsMap.set(sId, cur);
        }
      });
    }

    // 4. Fetch Study Sessions for Streak, Today Study Seconds, and Recent Subjects
    const { data: sessions } = await supabaseServer
      .from('student_topic_sessions')
      .select(`
        id,
        started_at,
        duration_seconds,
        status,
        topic_id,
        topics (
          id,
          name,
          subject_id,
          subjects (
            id,
            name,
            slug
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 60)
      .order('started_at', { ascending: false });

    // Calculate Streak & Today's Study Time
    let todayStudySeconds = 0;
    let currentStreak = 0;
    let mostRecentTopicId = sessions && sessions.length > 0 ? sessions[0].topic_id : null;
    let recentTopicDetails: any = null;
    
    const seenSubjectIds = new Set<string>();
    const recentSubjects: any[] = [];

    if (sessions && sessions.length > 0) {
      const studyDays = new Set<string>();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

      sessions.forEach(s => {
        const d = new Date(s.started_at);
        const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        studyDays.add(dayStr);
        
        if (dayStr === todayStr) {
          todayStudySeconds += (s.duration_seconds || 0);
        }

        // Aggregate Recent Subjects (distinct, sorted by latest session)
        const topic: any = s.topics;
        const subjectData = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
        if (subjectData && !seenSubjectIds.has(subjectData.id)) {
          seenSubjectIds.add(subjectData.id);
          
          const sessionDate = new Date(s.started_at);
          const sMid = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
          const nowMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffDays = Math.round((nowMid.getTime() - sMid.getTime()) / (1000 * 60 * 60 * 24));
          
          let relativeTime = '';
          if (diffDays === 0) relativeTime = 'Studied today';
          else if (diffDays === 1) relativeTime = 'Studied yesterday';
          else if (diffDays > 1 && diffDays < 30) relativeTime = `${diffDays} days ago`;
          else relativeTime = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          recentSubjects.push({
            id: subjectData.id,
            name: subjectData.name,
            slug: subjectData.slug,
            lastStudiedAt: s.started_at,
            relativeTime,
            topicName: topic?.name
          });
        }
      });

      // Calculate streak walking backwards from today
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
          if (dayCounter === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            dayCounter++;
          } else {
            streakActive = false;
          }
        }
      }

      // Populate recent topic details
      const firstSessionTopic: any = sessions[0].topics;
      if (firstSessionTopic) {
        const subj: any = Array.isArray(firstSessionTopic.subjects) ? firstSessionTopic.subjects[0] : firstSessionTopic.subjects;
        recentTopicDetails = {
          id: firstSessionTopic.id,
          name: firstSessionTopic.name,
          subjectName: subj?.name || 'General'
        };
      }
    }

    // 5. Fetch Subjects, Topics, and Student Topic Progress for Curriculum Progress
    const { data: allSubjects } = await supabaseServer
      .from('subjects')
      .select('id, name, slug, display_order')
      .order('display_order', { ascending: true });

    const { data: allTopics } = await supabaseServer
      .from('topics')
      .select('id, subject_id, name, slug');

    const { data: allTopicProgress } = await supabaseServer
      .from('student_topic_progress')
      .select('topic_id, status')
      .eq('user_id', user.id);

    const completedTopicIds = new Set(
      (allTopicProgress || [])
        .filter(p => p.status === 'COMPLETED')
        .map(p => p.topic_id)
    );

    const subjectProgress = (allSubjects || []).map(subject => {
      const subjectTopics = (allTopics || []).filter(t => t.subject_id === subject.id);
      const totalTopics = subjectTopics.length;
      const completedTopics = subjectTopics.filter(t => completedTopicIds.has(t.id)).length;
      const topicCompletionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      
      const mcqStats = subjectAttemptsMap.get(subject.id);
      const mcqAttempted = mcqStats ? mcqStats.total : 0;
      const mcqCorrect = mcqStats ? mcqStats.correct : 0;
      const mcqAccuracy = mcqAttempted > 0 ? Math.round((mcqCorrect / mcqAttempted) * 100) : null;
      const hasMcqData = mcqAttempted > 0;

      return {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        totalTopics,
        completedTopics,
        topicCompletionPercentage,
        mcqAttempted,
        mcqCorrect,
        mcqAccuracy,
        hasMcqData
      };
    });

    // 6. Fetch Topic Spaced Revisions (M17)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: topicRevisions } = await supabaseServer
      .from('student_topic_revisions')
      .select(`
        id,
        topic_id,
        scheduled_for,
        status,
        interval_days,
        topics (
          id,
          name,
          subjects (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['SCHEDULED', 'OVERDUE']);
      
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
          subjectName: subjectData?.name || 'General',
          scheduledFor: r.scheduled_for,
          intervalDays: r.interval_days,
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

    // 7. Dashboard Engine Metrics
    const isNewUser = mappedMastery.length === 0 && (!recentAttempts || recentAttempts.length === 0);
    const readiness = calculateReadinessScore(mappedMastery);
    const subjects = calculateSubjectMastery(mappedMastery);
    const weakAreas = identifyWeakAreas(mappedMastery);
    const revisionStats = calculateRevisionStats(revisions || []);
    const performanceStats = calculatePerformanceStats(recentAttempts || []);
    const nextAction = determineNextAction(isNewUser, revisionStats, weakAreas);

    return Response.json({
      isNewUser,
      readiness,
      subjects,
      weakAreas,
      revisionStats,
      performanceStats,
      nextAction,
      activeRevisions,
      recentSubjects: recentSubjects.slice(0, 5),
      subjectProgress,
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
