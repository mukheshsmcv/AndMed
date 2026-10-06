import { supabaseServer } from '../../../../lib/supabase-server';

export async function GET(req: Request, { id }: { id: string }) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return Response.json({ error: 'Missing topic ID' }, { status: 400 });
    }

    // 1. Fetch Topic & Subject info
    const { data: topic, error: topicError } = await supabaseServer
      .from('topics')
      .select('*, subjects(id, name, slug)')
      .eq('id', id)
      .single();

    if (topicError || !topic) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    // 2. Fetch Progress
    const { data: progress } = await supabaseServer
      .from('student_topic_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .single();

    // 3. Fetch Mastery
    const { data: mastery } = await supabaseServer
      .from('topic_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .single();

    // 4. Fetch Question-level Revision items
    const { data: revisionItems } = await supabaseServer
      .from('revision_items')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .is('completed_at', null);

    // 5. Fetch Sessions
    const { data: sessions } = await supabaseServer
      .from('student_topic_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .in('status', ['COMPLETED', 'ACTIVE']) // Include active to allow resume
      .order('started_at', { ascending: false });

    const completedSessions = (sessions || []).filter(s => s.status === 'COMPLETED');
    const topicRevisionCount = Math.max(0, completedSessions.length - 1);

    return Response.json({
      topic: {
        ...topic,
        subjectName: topic.subjects?.name,
        subjectSlug: topic.subjects?.slug
      },
      progress: progress || { status: 'NOT_STARTED' },
      mastery: mastery || { mastery_score: 0, questions_attempted: 0 },
      revisionCount: topicRevisionCount,
      pendingQuestionRevisions: revisionItems?.length || 0,
      sessions: sessions || []
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
