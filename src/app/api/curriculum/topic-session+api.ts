import { supabaseServer } from '../../../lib/supabase-server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topicId, action, durationSeconds } = await req.json();

    if (!topicId || !action) {
      return Response.json({ error: 'topicId and action are required' }, { status: 400 });
    }

    if (!['start', 'complete', 'abandon'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'start') {
      // 1. Check if user already has an ACTIVE session
      const { data: existingActive } = await supabaseServer
        .from('student_topic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingActive) {
        // If the active session is for the same topic, resume it
        if (existingActive.topic_id === topicId) {
          return Response.json({ success: true, session: existingActive, resumed: true });
        }
        // If active session was for a different topic, complete/close previous one first
        const now = Date.now();
        const prevStart = new Date(existingActive.started_at).getTime();
        const prevDuration = Math.max(1, Math.floor((now - prevStart) / 1000));

        await supabaseServer
          .from('student_topic_sessions')
          .update({
            status: 'COMPLETED',
            ended_at: new Date().toISOString(),
            duration_seconds: prevDuration,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingActive.id);
      }

      // 2. Mark progress as IN_PROGRESS if currently NOT_STARTED
      const { data: currentProg } = await supabaseServer
        .from('student_topic_progress')
        .select('status')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle();

      if (!currentProg || currentProg.status !== 'COMPLETED') {
        await supabaseServer.from('student_topic_progress').upsert({
          user_id: user.id,
          topic_id: topicId,
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, topic_id' });
      }

      // 3. Create single ACTIVE session
      const { data: newSession, error: insertError } = await supabaseServer
        .from('student_topic_sessions')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          status: 'ACTIVE',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Session insert error:', insertError);
        return Response.json({ error: insertError.message }, { status: 500 });
      }

      return Response.json({ success: true, session: newSession });
    } 
    
    if (action === 'complete' || action === 'abandon') {
      const finalStatus = action === 'complete' ? 'COMPLETED' : 'ABANDONED';
      
      // Update any active session for this topic
      const { data: activeSessions } = await supabaseServer
        .from('student_topic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false });

      if (activeSessions && activeSessions.length > 0) {
        for (const session of activeSessions) {
          const startedAt = new Date(session.started_at).getTime();
          const now = Date.now();
          const calcDuration = Math.max(1, Math.floor((now - startedAt) / 1000));
          const finalDuration = durationSeconds || calcDuration;

          await supabaseServer.from('student_topic_sessions')
            .update({
              status: finalStatus,
              ended_at: new Date().toISOString(),
              duration_seconds: finalDuration,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
