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

    const { topicId, status } = await req.json();

    if (!topicId || !status) {
      return Response.json({ error: 'topicId and status are required' }, { status: 400 });
    }

    if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Upsert student_topic_progress
    const manuallyCompleted = status === 'COMPLETED';
    const manuallyCompletedAt = manuallyCompleted ? new Date().toISOString() : null;

    const { error: upsertError } = await supabaseServer
      .from('student_topic_progress')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        status: status,
        manually_completed: manuallyCompleted,
        manually_completed_at: manuallyCompletedAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, topic_id'
      });

    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 });
    }

    return Response.json({ success: true, status });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
