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
    const url = new URL(req.url);
    const clientDateStr = url.searchParams.get('clientDate'); // Format: YYYY-MM-DD
    const tzOffsetParam = url.searchParams.get('tzOffset');
    const tzOffsetMinutes = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch User and Metadata
    const dailyTargetHours = user?.user_metadata?.daily_study_target_hours || 6;

    // 2. Fetch Mastery Records
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

    // 4. Fetch ACTIVE Study Session (Phase 2 & 6)
    const { data: activeSessionRow } = await supabaseServer
      .from('student_topic_sessions')
      .select(`
        id,
        started_at,
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
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let activeStudySession: any = null;
    if (activeSessionRow) {
      const topic: any = activeSessionRow.topics;
      const subj = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
      const startedAtTime = new Date(activeSessionRow.started_at).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtTime) / 1000));
      
      activeStudySession = {
        sessionId: activeSessionRow.id,
        topicId: activeSessionRow.topic_id,
        topicName: topic?.name || 'Current Topic',
        subjectId: subj?.id || topic?.subject_id,
        subjectName: subj?.name || 'Current Subject',
        startedAt: activeSessionRow.started_at,
        elapsedSeconds
      };
    }

    // 5. Fetch Completed Study Sessions for Streak, Today Study Seconds, and Recent Subjects
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
    let recentTopicDetails: any = null;
    
    const seenSubjectIds = new Set<string>();
    // Exclude active subject from historical recent subjects to prevent duplicate listing
    if (activeStudySession?.subjectId) {
      seenSubjectIds.add(activeStudySession.subjectId);
    }

    const recentSubjects: any[] = [];

    if (sessions && sessions.length > 0) {
      const studyDays = new Map<string, number>(); // dayStr -> totalSeconds
      const serverToday = new Date();
      // If clientDateStr is missing, fallback to server's date
      const todayStr = clientDateStr || `${serverToday.getFullYear()}-${String(serverToday.getMonth()+1).padStart(2,'0')}-${String(serverToday.getDate()).padStart(2,'0')}`;

      // Helper to convert UTC date to client's local YYYY-MM-DD string
      const getClientLocalString = (utcDate: Date) => {
        if (!tzOffsetParam) {
          // Fallback: use server's local interpretation
          return `${utcDate.getFullYear()}-${String(utcDate.getMonth()+1).padStart(2,'0')}-${String(utcDate.getDate()).padStart(2,'0')}`;
        }
        // tzOffset is in minutes, e.g. IST is -330 (which means local is UTC + 330 minutes)
        // JS Date getTime() is absolute ms since UTC epoch. 
        // We subtract tzOffsetMinutes * 60000 to get a mock UTC date that represents the client's local time
        const localTimeMock = new Date(utcDate.getTime() - (tzOffsetMinutes * 60000));
        return `${localTimeMock.getUTCFullYear()}-${String(localTimeMock.getUTCMonth()+1).padStart(2,'0')}-${String(localTimeMock.getUTCDate()).padStart(2,'0')}`;
      };

      sessions.forEach(s => {
        const d = new Date(s.started_at);
        const dayStr = getClientLocalString(d);
        const currentTotal = studyDays.get(dayStr) || 0;
        studyDays.set(dayStr, currentTotal + (s.duration_seconds || 0));
        
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
          const nowMid = new Date(serverToday.getFullYear(), serverToday.getMonth(), serverToday.getDate());
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

      // Daily Goals & Streak Logic
      const defaultTargetSeconds = dailyTargetHours * 3600;
      
      // Attempt to upsert today's goal snapshot (graceful fallback if table missing)
      try {
        await supabaseServer.from('student_daily_goals').upsert({
          user_id: user.id,
          local_date: todayStr,
          target_seconds: defaultTargetSeconds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, local_date' });
      } catch (e) {
        // Table might not exist yet; ignore
      }

      // Fetch historical goals
      const dailyGoalsMap = new Map<string, number>();
      try {
        const { data: goals } = await supabaseServer
          .from('student_daily_goals')
          .select('local_date, target_seconds')
          .eq('user_id', user.id);
        if (goals) {
          goals.forEach(g => dailyGoalsMap.set(g.local_date, g.target_seconds));
        }
      } catch (e) {
        // Fallback handled below
      }

      // Calculate streak walking backwards from today
      let checkDate = new Date(clientDateStr ? new Date(clientDateStr) : serverToday);
      let streakActive = true;
      let dayCounter = 0;

      while (streakActive) {
        const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
        const actualSeconds = studyDays.get(checkStr) || 0;
        const targetSeconds = dailyGoalsMap.get(checkStr) || defaultTargetSeconds;
        
        const isSuccessfulDay = actualSeconds >= targetSeconds;

        if (isSuccessfulDay) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          dayCounter++;
        } else {
          if (dayCounter === 0) {
            // It's today, and we haven't reached the goal yet. 
            // We don't break the streak immediately; we just skip today and check yesterday.
            checkDate.setDate(checkDate.getDate() - 1);
            dayCounter++;
          } else {
            // Streak broken
            streakActive = false;
          }
        }
      }

      // Populate recent topic details from completed sessions if not active
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

    // If there is an active session, it overrides recentTopicDetails for Today's Focus
    if (activeStudySession) {
      recentTopicDetails = {
        id: activeStudySession.topicId,
        name: activeStudySession.topicName,
        subjectName: activeStudySession.subjectName,
        isActive: true,
        startedAt: activeStudySession.startedAt
      };
    }

    // 6. Fetch Subjects, Topics, and Student Topic Progress for Curriculum Progress
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

    // 7. Fetch Topic Spaced Revisions (M17)
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
      
      activeRevisions.sort((a: any, b: any) => {
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      });
    }

    // 8. Dashboard Engine Metrics
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
      activeStudySession,
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
