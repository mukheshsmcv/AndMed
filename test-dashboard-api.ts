import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const testEmail = "m19_sync_@andemed.test";
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail, password: 'TestPass!9876', email_confirm: true
  });
  
  const { data: signIn } = await supabase.auth.signInWithPassword({ email: testEmail, password: 'TestPass!9876' });
  const userId = signIn.session!.user.id;
  const token = signIn.session!.access_token;

  const { data: topics } = await supabaseAdmin.from('topics').select('id, name').limit(1);
  const topicId = topics![0].id;

  // Insert ACTIVE session
  await supabaseAdmin.from('student_topic_sessions').insert({
    user_id: userId,
    topic_id: topicId,
    status: 'ACTIVE',
    started_at: new Date().toISOString()
  });

  // Query exactly as dashboard+api.ts does
  const { data: activeSessionRow, error } = await supabaseAdmin
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
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  console.log("DB ACTIVE QUERY RESULT:");
  console.log(JSON.stringify(activeSessionRow, null, 2));

  // Simulate parsing logic
  let activeStudySession: any = null;
  if (activeSessionRow) {
    const topic: any = activeSessionRow.topics;
    const subj = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
    
    activeStudySession = {
      sessionId: activeSessionRow.id,
      topicId: activeSessionRow.topic_id,
      topicName: topic?.name || 'Current Topic',
      subjectId: subj?.id || topic?.subject_id,
      subjectName: subj?.name || 'Current Subject',
      startedAt: activeSessionRow.started_at
    };
  }
  
  console.log("\nPARSED activeStudySession:");
  console.log(JSON.stringify(activeStudySession, null, 2));

  await supabaseAdmin.auth.admin.deleteUser(userId);
}

run();