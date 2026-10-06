import { supabaseServer } from '../../lib/supabase-server';

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

    // 1. Fetch ACTIVE Study Session
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

    let activeSession: any = null;
    if (activeSessionRow) {
      const topic: any = activeSessionRow.topics;
      const subj = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
      
      activeSession = {
        sessionId: activeSessionRow.id,
        topicId: activeSessionRow.topic_id,
        topicName: topic?.name || 'Current Topic',
        subjectId: subj?.id || topic?.subject_id,
        subjectName: subj?.name || 'Current Subject',
        startedAt: activeSessionRow.started_at
      };
    }

    // 2. Fetch COMPLETED Study Sessions (duration >= 60s)
    const { data: completedSessions } = await supabaseServer
      .from('student_topic_sessions')
      .select(`
        id,
        started_at,
        ended_at,
        duration_seconds,
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

    // Helper to convert UTC date to client's local YYYY-MM-DD string
    const getClientLocalString = (utcDate: Date) => {
      if (!tzOffsetParam) {
        return `${utcDate.getFullYear()}-${String(utcDate.getMonth()+1).padStart(2,'0')}-${String(utcDate.getDate()).padStart(2,'0')}`;
      }
      const localTimeMock = new Date(utcDate.getTime() - (tzOffsetMinutes * 60000));
      return `${localTimeMock.getUTCFullYear()}-${String(localTimeMock.getUTCMonth()+1).padStart(2,'0')}-${String(localTimeMock.getUTCDate()).padStart(2,'0')}`;
    };

    const serverToday = new Date();
    const todayStr = clientDateStr || `${serverToday.getFullYear()}-${String(serverToday.getMonth()+1).padStart(2,'0')}-${String(serverToday.getDate()).padStart(2,'0')}`;

    let totalSeconds = 0;
    const todaySessions: any[] = [];
    const recentSessions: any[] = [];

    if (completedSessions) {
      completedSessions.forEach((s: any) => {
        const topic: any = s.topics;
        const subj = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
        const sessionObj = {
          sessionId: s.id,
          topicId: s.topic_id,
          topicName: topic?.name || 'Unknown Topic',
          subjectId: subj?.id || topic?.subject_id,
          subjectName: subj?.name || 'Unknown Subject',
          startedAt: s.started_at,
          endedAt: s.ended_at,
          durationSeconds: s.duration_seconds
        };

        const sessionDate = new Date(s.started_at);
        const dayStr = getClientLocalString(sessionDate);

        // Map to today if it matches the client's today string
        if (dayStr === todayStr) {
          totalSeconds += (s.duration_seconds || 0);
          todaySessions.push(sessionObj);
        }

        // Map to recent (we want 3 UNIQUE subjects)
        if (recentSessions.length < 3) {
          const exists = recentSessions.some(r => r.subjectId === sessionObj.subjectId);
          if (!exists) {
            recentSessions.push({
              subjectId: sessionObj.subjectId,
              subjectName: sessionObj.subjectName,
              topicName: sessionObj.topicName,
              lastStudiedAt: sessionObj.startedAt
            });
          }
        }
      });
    }

    return Response.json({
      activeSession,
      today: {
        totalSeconds,
        totalMinutes: Math.floor(totalSeconds / 60),
        sessions: todaySessions
      },
      recent: recentSessions
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}