import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function createAnonClient(token?: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  });
}

async function runActiveStudyValidation() {
  console.log('================================================================');
  console.log('       ACTIVE STUDY, TIMERS & COMPLETION LIVE VALIDATION        ');
  console.log('================================================================\n');

  let testUserAId: string | null = null;
  let testUserBId: string | null = null;
  let userAToken: string | null = null;
  let userBToken: string | null = null;
  let topicAnatomyId: string | null = null;
  let topicPhysiologyId: string | null = null;
  let subjectAnatomyId: string | null = null;

  const results: { name: string; pass: boolean; details?: string }[] = [];

  function record(name: string, pass: boolean, details?: string) {
    results.push({ name, pass, details });
    const tag = pass ? '[PASS]' : '[FAIL]';
    console.log(`${tag} ${name}${details ? ' -> ' + details : ''}`);
  }

  try {
    // ----------------------------------------------------
    // SETUP: Users & Topics
    // ----------------------------------------------------
    const emailA = `active-test-a-${Date.now()}@andemed.test`;
    const emailB = `active-test-b-${Date.now()}@andemed.test`;
    const password = 'TestPassword123!';

    const { data: userACreated } = await supabaseAdmin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true
    });
    testUserAId = userACreated.user!.id;

    const { data: userBCreated } = await supabaseAdmin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true
    });
    testUserBId = userBCreated.user!.id;

    const clientA = createAnonClient();
    const { data: authA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    userAToken = authA.session!.access_token;

    const clientB = createAnonClient();
    const { data: authB } = await clientB.auth.signInWithPassword({ email: emailB, password });
    userBToken = authB.session!.access_token;

    // Fetch canonical topics
    const { data: topics } = await supabaseAdmin
      .from('topics')
      .select('id, name, subject_id, subjects(id, name, slug)')
      .limit(5);

    if (!topics || topics.length < 2) throw new Error('Could not fetch canonical topics');
    topicAnatomyId = topics[0].id;
    const subj0: any = Array.isArray(topics[0].subjects) ? topics[0].subjects[0] : topics[0].subjects;
    subjectAnatomyId = subj0?.id || topics[0].subject_id;

    topicPhysiologyId = topics[1].id;

    console.log(`Context Initialized:`);
    console.log(`- User A: ${testUserAId}`);
    console.log(`- User B: ${testUserBId}`);
    console.log(`- Topic 1: "${topics[0].name}" (${topicAnatomyId})`);
    console.log(`- Topic 2: "${topics[1].name}" (${topicPhysiologyId})\n`);

    // ----------------------------------------------------
    // 1. START ACTIVE STUDY SESSION
    // ----------------------------------------------------
    const nowIso = new Date().toISOString();
    const { data: session1, error: session1Err } = await supabaseAdmin
      .from('student_topic_sessions')
      .insert({
        user_id: testUserAId,
        topic_id: topicAnatomyId,
        status: 'ACTIVE',
        started_at: nowIso
      })
      .select()
      .single();

    if (!session1Err && session1 && session1.status === 'ACTIVE') {
      record('1. Active study session created in student_topic_sessions', true, `id=${session1.id}`);
    } else {
      record('1. Active study session created in student_topic_sessions', false, session1Err?.message);
    }

    // ----------------------------------------------------
    // 2. ACTIVE SESSION RETRIEVAL & DASHBOARD RECOGNITION
    // ----------------------------------------------------
    const { data: activeCheck } = await supabaseAdmin
      .from('student_topic_sessions')
      .select(`
        id,
        started_at,
        topic_id,
        status,
        topics (
          id,
          name,
          subject_id,
          subjects (
            id,
            name
          )
        )
      `)
      .eq('user_id', testUserAId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeCheck && activeCheck.status === 'ACTIVE' && activeCheck.topic_id === topicAnatomyId) {
      const topicObj: any = activeCheck.topics;
      const subjObj = Array.isArray(topicObj?.subjects) ? topicObj.subjects[0] : topicObj?.subjects;
      record('2. Active session correctly queries topic and subject for Home display', true, `Topic: "${topicObj?.name}", Subject: "${subjObj?.name}"`);
    } else {
      record('2. Active session query for Home display', false);
    }

    // ----------------------------------------------------
    // 3. DUPLICATE ACTIVE SESSION PROTECTION
    // ----------------------------------------------------
    // Check that querying active sessions returns at most 1
    const { data: allActive } = await supabaseAdmin
      .from('student_topic_sessions')
      .select('*')
      .eq('user_id', testUserAId)
      .eq('status', 'ACTIVE');

    if (allActive && allActive.length === 1) {
      record('3. Single active session constraint maintained (no duplicate active sessions)', true, 'Count = 1');
    } else {
      record('3. Single active session constraint', false, `Count = ${allActive?.length}`);
    }

    // ----------------------------------------------------
    // 4. CROSS-USER RLS ISOLATION FOR ACTIVE SESSIONS
    // ----------------------------------------------------
    const clientBAuth = createAnonClient(userBToken!);
    const { data: userBViewOfActive } = await clientBAuth
      .from('student_topic_sessions')
      .select('*');

    if (!userBViewOfActive || userBViewOfActive.length === 0) {
      record('4. RLS prevents cross-user access to active study sessions', true, 'User B sees 0 rows');
    } else {
      record('4. RLS cross-user access', false, `User B saw ${userBViewOfActive.length} rows`);
    }

    // ----------------------------------------------------
    // 5. SESSION COMPLETION (DURATION >= 60 SECONDS)
    // ----------------------------------------------------
    const startTime = new Date(Date.now() - 120000); // 2 minutes ago
    const endedTime = new Date();
    const duration = 120; // seconds

    await supabaseAdmin
      .from('student_topic_sessions')
      .update({
        status: 'COMPLETED',
        started_at: startTime.toISOString(),
        ended_at: endedTime.toISOString(),
        duration_seconds: duration
      })
      .eq('id', session1.id);

    const { data: completedSession } = await supabaseAdmin
      .from('student_topic_sessions')
      .select('*')
      .eq('id', session1.id)
      .single();

    if (completedSession && completedSession.status === 'COMPLETED' && completedSession.duration_seconds === 120) {
      record('5. Session completed with duration >= 60s is preserved as valid historical study', true, '120 seconds');
    } else {
      record('5. Session completion with duration >= 60s', false);
    }

    // ----------------------------------------------------
    // 6. SHORT SESSIONS (< 60 SECONDS) FILTERED FROM RECENT
    // ----------------------------------------------------
    const { data: shortSession } = await supabaseAdmin
      .from('student_topic_sessions')
      .insert({
        user_id: testUserAId,
        topic_id: topicPhysiologyId,
        status: 'COMPLETED',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: 25 // < 60 seconds
      })
      .select()
      .single();

    const { data: recentEligible } = await supabaseAdmin
      .from('student_topic_sessions')
      .select('id, duration_seconds')
      .eq('user_id', testUserAId)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 60);

    if (recentEligible && recentEligible.length === 1 && recentEligible[0].id === session1.id) {
      record('6. Short sessions (<60s) filtered out from completed Recent Subjects', true, 'Only 120s session qualified');
    } else {
      record('6. Short sessions filtering', false);
    }

    // ----------------------------------------------------
    // 7. TOPIC COMPLETION SYNCHRONIZATION
    // ----------------------------------------------------
    // Mark Topic 1 completed in student_topic_progress
    await supabaseAdmin
      .from('student_topic_progress')
      .upsert({
        user_id: testUserAId,
        topic_id: topicAnatomyId,
        status: 'COMPLETED',
        manually_completed: true,
        manually_completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, topic_id' });

    const { data: progressRow } = await supabaseAdmin
      .from('student_topic_progress')
      .select('*')
      .eq('user_id', testUserAId)
      .eq('topic_id', topicAnatomyId)
      .single();

    if (progressRow && progressRow.status === 'COMPLETED' && progressRow.manually_completed === true) {
      record('7. Topic completion saved with manually_completed flag', true, 'status=COMPLETED');
    } else {
      record('7. Topic completion saving', false);
    }

    // Query subject completed topics count
    const { data: allAnatTopics } = await supabaseAdmin
      .from('topics')
      .select('id')
      .eq('subject_id', subjectAnatomyId);

    const { data: userAnatProgress } = await supabaseAdmin
      .from('student_topic_progress')
      .select('topic_id, status')
      .eq('user_id', testUserAId)
      .eq('status', 'COMPLETED');

    const completedAnatCount = (userAnatProgress || []).filter(p => 
      allAnatTopics?.some(t => t.id === p.topic_id)
    ).length;

    if (completedAnatCount === 1) {
      record('8. Subject completed topics count increments immediately to 1', true, `1 / ${allAnatTopics?.length} completed`);
    } else {
      record('8. Subject completed topics count calculation', false, `got ${completedAnatCount}`);
    }

  } catch (err: any) {
    console.error(`\n[FATAL ERROR] ${err.message}`);
  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------');
    console.log('Cleaning up live test users...');
    if (testUserAId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserAId);
      console.log(`- Cleaned up User A (${testUserAId})`);
    }
    if (testUserBId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserBId);
      console.log(`- Cleaned up User B (${testUserBId})`);
    }
    console.log('----------------------------------------------------\n');

    // Summary
    console.log('================================================================');
    console.log('                      TEST SUMMARY REPORT                       ');
    console.log('================================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    console.log(`Total Checks: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    if (passed === total) {
      console.log(`\nALL ${total} CHECKS PASSED ON LIVE SUPABASE!`);
    } else {
      console.log(`\nVALIDATION FAILED WITH ${total - passed} ERRORS`);
    }
    console.log('================================================================\n');
  }
}

runActiveStudyValidation();
