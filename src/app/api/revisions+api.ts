import { supabaseServer } from '../../lib/supabase-server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // 1. Fetch Topic Spaced Revisions
    const { data: revisions, error: revError } = await supabaseServer
      .from('student_topic_revisions')
      .select(`
        id,
        topic_id,
        scheduled_for,
        completed_at,
        status,
        interval_days,
        created_at,
        topics (
          id,
          name,
          slug,
          subjects (
            id,
            name,
            slug
          )
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    if (revError) {
      return Response.json({ error: revError.message }, { status: 500 });
    }

    const dueToday: any[] = [];
    const overdue: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    (revisions || []).forEach((r: any) => {
      const topic = r.topics;
      const subject = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
      
      const sDate = new Date(r.scheduled_for);
      sDate.setHours(0, 0, 0, 0);
      const diffTime = sDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const item = {
        id: r.id,
        topicId: r.topic_id,
        topicName: topic?.name || 'Unknown Topic',
        topicSlug: topic?.slug,
        subjectId: subject?.id,
        subjectName: subject?.name || 'General',
        scheduledFor: r.scheduled_for,
        intervalDays: r.interval_days,
        completedAt: r.completed_at,
        status: r.status,
        diffDays
      };

      if (r.status === 'COMPLETED') {
        completed.push(item);
      } else if (r.status === 'SKIPPED') {
        // Skipped revisions are archived
      } else if (diffDays < 0 || r.status === 'OVERDUE') {
        overdue.push({
          ...item,
          status: 'OVERDUE',
          daysOverdue: Math.abs(diffDays)
        });
      } else if (diffDays === 0) {
        dueToday.push({
          ...item,
          status: 'DUE_TODAY'
        });
      } else {
        upcoming.push({
          ...item,
          status: 'UPCOMING',
          daysUntil: diffDays
        });
      }
    });

    // Sort overdue by most overdue first
    overdue.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
    
    // Sort upcoming by nearest date
    upcoming.sort((a, b) => a.diffDays - b.diffDays);

    // 2. Fetch Question Revisions (dormant/legacy MCQs from revision_items)
    const { data: qRevisions } = await supabaseServer
      .from('revision_items')
      .select('id, question_id, topic_id, scheduled_date, completed_at')
      .eq('user_id', user.id)
      .is('completed_at', null);

    const questionRevisionsCount = qRevisions?.length || 0;

    return Response.json({
      topicRevisions: {
        dueToday,
        overdue,
        upcoming,
        completed,
        totalActive: dueToday.length + overdue.length + upcoming.length
      },
      questionRevisions: {
        count: questionRevisionsCount
      }
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
