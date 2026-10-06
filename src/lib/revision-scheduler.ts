import { supabaseServer } from './supabase-server';

export const M17_SPACING_INTERVALS = [7, 14, 30, 60, 90] as const;

export function getNextRevisionInterval(completedCount: number): number {
  if (completedCount <= 0) return 7;
  if (completedCount === 1) return 14;
  if (completedCount === 2) return 30;
  if (completedCount === 3) return 60;
  return 90;
}

export async function scheduleTopicRevision(userId: string, topicId: string) {
  // Find existing revisions to determine the next interval
  const { data: existingRevisions, error: fetchError } = await supabaseServer
    .from('student_topic_revisions')
    .select('id, status, interval_days')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching topic revisions:', fetchError);
    return null;
  }

  // Check duplicate protection: if there is an active revision (SCHEDULED or OVERDUE), don't create a new one
  const hasActive = existingRevisions?.some(r => r.status === 'SCHEDULED' || r.status === 'OVERDUE');
  if (hasActive) {
    return null;
  }

  const completedCount = existingRevisions ? existingRevisions.filter(r => r.status === 'COMPLETED').length : 0;
  const nextInterval = getNextRevisionInterval(completedCount);

  // Calculate scheduled_for date using calendar days
  const now = new Date();
  const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nextInterval);
  const scheduledFor = scheduledDate.toISOString().split('T')[0];

  const { data: newRevision, error: insertError } = await supabaseServer
    .from('student_topic_revisions')
    .insert({
      user_id: userId,
      topic_id: topicId,
      status: 'SCHEDULED',
      interval_days: nextInterval,
      scheduled_for: scheduledFor
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error scheduling topic revision:', insertError);
    return null;
  }

  return newRevision;
}

export async function completeTopicRevision(userId: string, revisionId: string) {
  // 1. Get the existing revision
  const { data: revision, error: fetchError } = await supabaseServer
    .from('student_topic_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !revision) {
    console.error('Error finding revision to complete:', fetchError);
    return null;
  }

  // 2. Mark as COMPLETED
  const { error: updateError } = await supabaseServer
    .from('student_topic_revisions')
    .update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', revisionId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating revision to completed:', updateError);
    return null;
  }

  // 3. Schedule the next revision cycle
  const nextRevision = await scheduleTopicRevision(userId, revision.topic_id);
  return nextRevision;
}

export async function skipTopicRevision(userId: string, revisionId: string) {
  const { data: updated, error: updateError } = await supabaseServer
    .from('student_topic_revisions')
    .update({
      status: 'SKIPPED',
      updated_at: new Date().toISOString()
    })
    .eq('id', revisionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error skipping revision:', updateError);
    return null;
  }

  return updated;
}

