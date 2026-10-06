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
      // 1. Update topic progress status to IN_PROGRESS
      await supabaseServer.from('student_topic_progress').upsert({
        user_id: user.id,
        topic_id: topicId,
        status: 'IN_PROGRESS',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, topic_id' });

      // 2. Create new active session
      const { data, error: insertError } = await supabaseServer.from('student_topic_sessions').insert({
        user_id: user.id,
        topic_id: topicId,
        status: 'ACTIVE',
        started_at: new Date().toISOString()
      }).select().single();

      // If the table doesn't exist yet, we still return success to keep the client working based on progress status
      if (insertError) {
        console.warn('Session insert failed (table may not exist):', insertError.message);
        return Response.json({ success: true, warning: 'session_table_missing' });
      }

      return Response.json({ success: true, session: data });
    } 
    
    if (action === 'complete' || action === 'abandon') {
      const finalStatus = action === 'complete' ? 'COMPLETED' : 'ABANDONED';
      
      // Update session if it exists
      const { data: activeSessions } = await supabaseServer
        .from('student_topic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false })
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        const session = activeSessions[0];
        const startedAt = new Date(session.started_at).getTime();
        const now = Date.now();
        const calcDuration = Math.floor((now - startedAt) / 1000);
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

      // Update global topic progress if completed
      if (action === 'complete') {
        await supabaseServer.from('student_topic_progress').upsert({
          user_id: user.id,
          topic_id: topicId,
          status: 'COMPLETED',
          manually_completed: true,
          manually_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, topic_id' });
      } else if (action === 'abandon') {
        // Just revert to NOT_STARTED if it was abandoned and not previously completed
        // (Simplified for this milestone)
        await supabaseServer.from('student_topic_progress').update({
          status: 'NOT_STARTED',
          updated_at: new Date().toISOString()
        }).eq('user_id', user.id).eq('topic_id', topicId).eq('status', 'IN_PROGRESS');
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
