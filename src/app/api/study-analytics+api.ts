import { supabaseServer } from '../../lib/supabase-server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const tzOffsetParam = url.searchParams.get('tzOffset');
    const tzOffsetMinutes = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;
    
    if (!startDateStr || !endDateStr) {
      return Response.json({ error: 'Missing startDate or endDate' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Helper to convert UTC date to client's local YYYY-MM-DD string
    const getClientLocalString = (utcDate: Date) => {
      if (!tzOffsetParam) {
        return `${utcDate.getFullYear()}-${String(utcDate.getMonth()+1).padStart(2,'0')}-${String(utcDate.getDate()).padStart(2,'0')}`;
      }
      const localTimeMock = new Date(utcDate.getTime() - (tzOffsetMinutes * 60000));
      return `${localTimeMock.getUTCFullYear()}-${String(localTimeMock.getUTCMonth()+1).padStart(2,'0')}-${String(localTimeMock.getUTCDate()).padStart(2,'0')}`;
    };

    // Calculate absolute UTC boundaries for the query to ensure we fetch all relevant sessions.
    // We add 1 day to endDate and subtract 1 day from startDate to cover timezone extremes.
    const startObj = new Date(startDateStr);
    startObj.setUTCDate(startObj.getUTCDate() - 1);
    
    const endObj = new Date(endDateStr);
    endObj.setUTCDate(endObj.getUTCDate() + 2);

    const { data: sessions, error } = await supabaseServer
      .from('student_topic_sessions')
      .select('started_at, duration_seconds')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 1)
      .gte('started_at', startObj.toISOString())
      .lte('started_at', endObj.toISOString());

    if (error) throw error;

    // Aggregate by local calendar date
    const dailyData = new Map<string, { durationSeconds: number; sessionCount: number }>();
    
    // Initialize requested range with 0
    let curr = new Date(startDateStr);
    const end = new Date(endDateStr);
    let rangeDays = 0;
    
    while (curr <= end) {
      const dStr = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
      dailyData.set(dStr, { durationSeconds: 0, sessionCount: 0 });
      curr.setDate(curr.getDate() + 1);
      rangeDays++;
    }

    if (sessions) {
      sessions.forEach((s: any) => {
        const d = new Date(s.started_at);
        const dayStr = getClientLocalString(d);
        
        if (dailyData.has(dayStr)) {
          const current = dailyData.get(dayStr)!;
          current.durationSeconds += (s.duration_seconds || 0);
          current.sessionCount += 1;
        }
      });
    }

    let totalSeconds = 0;
    let studyDaysCount = 0;
    const daysArray: any[] = [];

    // Format output in ascending date order
    const sortedDates = Array.from(dailyData.keys()).sort();
    
    sortedDates.forEach(date => {
      const d = dailyData.get(date)!;
      daysArray.push({
        date,
        durationSeconds: d.durationSeconds,
        sessionCount: d.sessionCount
      });
      
      totalSeconds += d.durationSeconds;
      if (d.durationSeconds > 0) {
        studyDaysCount++;
      }
    });

    const averageSeconds = rangeDays > 0 ? Math.round(totalSeconds / rangeDays) : 0;

    return Response.json({
      days: daysArray,
      totalSeconds,
      averageSeconds,
      studyDays: studyDaysCount
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
