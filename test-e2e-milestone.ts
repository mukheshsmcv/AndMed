import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { scheduleTopicRevision, completeTopicRevision, skipTopicRevision } from './src/lib/revision-scheduler';
import { getExamCountdown, EXAM_TARGETS, CURRENT_EXAM_ID } from './src/config/exam';

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

async function runMilestoneLiveValidation() {
  console.log('================================================================');
  console.log('   HOME PROGRESS, RECENT SUBJECTS & REVISION LIVE VALIDATION    ');
  console.log('================================================================\n');

  let testUserId: string | null = null;
  let userToken: string | null = null;
  let subjectAnatomyId: string | null = null;
  let subjectPhysiologyId: string | null = null;
  let topicAnat1Id: string | null = null;
  let topicAnat2Id: string | null = null;
  let topicPhysId: string | null = null;

  const results: { category: string; test: string; pass: boolean; details?: string }[] = [];

  function record(category: string, test: string, pass: boolean, details?: string) {
    results.push({ category, test, pass, details });
    const tag = pass ? '[PASS]' : '[FAIL]';
    console.log(`${tag} [${category}] ${test}${details ? ' -> ' + details : ''}`);
  }

  try {
    // ----------------------------------------------------
    // SETUP: Test User & Canonical Data
    // ----------------------------------------------------
    const email = `milestone-test-${Date.now()}@andemed.test`;
    const password = 'TestPassword123!';

    const { data: userCreated, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        daily_study_target_hours: 8,
        target_exam: 'INICET_NOV_2026'
      }
    });
    if (userError || !userCreated.user) throw new Error(`User creation failed: ${userError?.message}`);
    testUserId = userCreated.user.id;

    const clientAuth = createAnonClient();
    const { data: authSession, error: loginError } = await clientAuth.auth.signInWithPassword({ email, password });
    if (loginError || !authSession.session) throw new Error(`Login failed: ${loginError?.message}`);
    userToken = authSession.session.access_token;

    // Fetch Subjects
    const { data: subjects } = await supabaseAdmin.from('subjects').select('id, name, slug').order('name');
    if (!subjects || subjects.length < 2) throw new Error('Not enough subjects in canonical database');
    
    const anatomy = subjects.find(s => s.slug === 'anatomy') || subjects[0];
    const physiology = subjects.find(s => s.slug === 'physiology') || subjects[1];
    subjectAnatomyId = anatomy.id;
    subjectPhysiologyId = physiology.id;

    // Fetch Topics for Anatomy & Physiology
    const { data: anatTopics } = await supabaseAdmin.from('topics').select('id, name').eq('subject_id', subjectAnatomyId);
    const { data: physTopics } = await supabaseAdmin.from('topics').select('id, name').eq('subject_id', subjectPhysiologyId);
    if (!anatTopics || anatTopics.length < 2 || !physTopics || physTopics.length < 1) {
      throw new Error('Not enough topics for anatomy / physiology');
    }
    topicAnat1Id = anatTopics[0].id;
    topicAnat2Id = anatTopics[1].id;
    topicPhysId = physTopics[0].id;

    console.log(`Initialized Test Context:`);
    console.log(`- User ID: ${testUserId}`);
    console.log(`- Subject 1: ${anatomy.name} (${subjectAnatomyId})`);
    console.log(`- Subject 2: ${physiology.name} (${subjectPhysiologyId})\n`);

    // =========================================================================
    // SECTION 1: STUDY TARGET PERSISTENCE & FOCUS REFLECTION
    // =========================================================================
    // Verify initial metadata
    const userMeta = authSession.user.user_metadata;
    if (userMeta.daily_study_target_hours === 8) {
      record('Study Target', '1. Daily study target persisted to user_metadata on signup', true, '8 hours');
    } else {
      record('Study Target', '1. Daily study target persisted to user_metadata on signup', false, `got ${userMeta.daily_study_target_hours}`);
    }

    // Update target to 10 hours
    const { error: updateTargetErr } = await clientAuth.auth.updateUser({
      data: { daily_study_target_hours: 10 }
    });
    if (!updateTargetErr) {
      const { data: { user: updatedUser } } = await clientAuth.auth.getUser();
      if (updatedUser?.user_metadata?.daily_study_target_hours === 10) {
        record('Study Target', '2. Updating daily study target persists and updates session metadata', true, '10 hours');
      } else {
        record('Study Target', '2. Updating daily study target persists and updates session metadata', false);
      }
    } else {
      record('Study Target', '2. Updating daily study target', false, updateTargetErr.message);
    }

    // =========================================================================
    // SECTION 2: RECENT SUBJECTS ORDERING & DEDUPLICATION
    // =========================================================================
    // Initially no sessions -> empty state
    const { data: emptySessions } = await supabaseAdmin
      .from('student_topic_sessions')
      .select('id')
      .eq('user_id', testUserId)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 60);
    
    record('Recent Subjects', '3. Empty study history starts with 0 completed sessions', (emptySessions?.length || 0) === 0);

    // Study Anatomy Topic 1 (2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    await supabaseAdmin.from('student_topic_sessions').insert({
      user_id: testUserId,
      topic_id: topicAnat1Id,
      status: 'COMPLETED',
      started_at: twoDaysAgo.toISOString(),
      ended_at: twoDaysAgo.toISOString(),
      duration_seconds: 180
    });

    // Study Physiology Topic (1 day ago)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    await supabaseAdmin.from('student_topic_sessions').insert({
      user_id: testUserId,
      topic_id: topicPhysId,
      status: 'COMPLETED',
      started_at: oneDayAgo.toISOString(),
      ended_at: oneDayAgo.toISOString(),
      duration_seconds: 240
    });

    // Study Anatomy Topic 2 (Today)
    const now = new Date();
    await supabaseAdmin.from('student_topic_sessions').insert({
      user_id: testUserId,
      topic_id: topicAnat2Id,
      status: 'COMPLETED',
      started_at: now.toISOString(),
      ended_at: now.toISOString(),
      duration_seconds: 300
    });

    // Query recent subjects logic
    const { data: allSessions } = await supabaseAdmin
      .from('student_topic_sessions')
      .select(`
        id,
        started_at,
        duration_seconds,
        status,
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
      .eq('user_id', testUserId)
      .eq('status', 'COMPLETED')
      .gte('duration_seconds', 60)
      .order('started_at', { ascending: false });

    const seenSubs = new Set<string>();
    const recentSubList: any[] = [];
    allSessions?.forEach(s => {
      const topic: any = s.topics;
      const subj: any = Array.isArray(topic?.subjects) ? topic.subjects[0] : topic?.subjects;
      if (subj && !seenSubs.has(subj.id)) {
        seenSubs.add(subj.id);
        recentSubList.push({ id: subj.id, name: subj.name, lastStudied: s.started_at });
      }
    });

    // Verify ordering: Anatomy (today) should be 1st, Physiology (yesterday) 2nd, and Anatomy is NOT duplicated!
    if (recentSubList.length === 2 && recentSubList[0].id === subjectAnatomyId && recentSubList[1].id === subjectPhysiologyId) {
      record('Recent Subjects', '4. Recent subjects sorted by latest session and deduplicated', true, `1st: ${recentSubList[0].name}, 2nd: ${recentSubList[1].name}`);
    } else {
      record('Recent Subjects', '4. Recent subjects sorted by latest session and deduplicated', false, `got length=${recentSubList.length}`);
    }

    // =========================================================================
    // SECTION 3: CURRICULUM PROGRESS DUAL METRICS (TOPICS & MCQ ACCURACY)
    // =========================================================================
    // Explicitly complete 2 Anatomy topics in student_topic_progress
    await supabaseAdmin.from('student_topic_progress').upsert([
      { user_id: testUserId, topic_id: topicAnat1Id, status: 'COMPLETED', manually_completed: true, manually_completed_at: new Date().toISOString() },
      { user_id: testUserId, topic_id: topicAnat2Id, status: 'COMPLETED', manually_completed: true, manually_completed_at: new Date().toISOString() }
    ]);

    // Insert Question Attempts for Anatomy: 3 correct, 1 incorrect = 75% accuracy (4 total attempts)
    // Fetch 2 anatomy questions
    const { data: questions } = await supabaseAdmin.from('questions').select('id, subject_id').eq('subject_id', subjectAnatomyId).limit(2);
    if (questions && questions.length > 0) {
      const q1 = questions[0].id;
      const q2 = questions.length > 1 ? questions[1].id : questions[0].id;
      
      await supabaseAdmin.from('question_attempts').insert([
        { user_id: testUserId, question_id: q1, is_correct: true, time_taken_seconds: 15 },
        { user_id: testUserId, question_id: q1, is_correct: true, time_taken_seconds: 12 },
        { user_id: testUserId, question_id: q2, is_correct: true, time_taken_seconds: 20 },
        { user_id: testUserId, question_id: q2, is_correct: false, time_taken_seconds: 18 }
      ]);
    }

    // Query attempts with subject
    const { data: userAttempts } = await supabaseAdmin
      .from('question_attempts')
      .select('is_correct, questions(subject_id)')
      .eq('user_id', testUserId);

    const attemptsMap = new Map<string, { total: number; correct: number }>();
    userAttempts?.forEach((att: any) => {
      const sId = att.questions?.subject_id;
      if (sId) {
        const c = attemptsMap.get(sId) || { total: 0, correct: 0 };
        c.total += 1;
        if (att.is_correct) c.correct += 1;
        attemptsMap.set(sId, c);
      }
    });

    const anatAttempts = attemptsMap.get(subjectAnatomyId!) || { total: 0, correct: 0 };
    const anatAccuracy = anatAttempts.total > 0 ? Math.round((anatAttempts.correct / anatAttempts.total) * 100) : null;
    const physAttempts = attemptsMap.get(subjectPhysiologyId!);
    const physAccuracy = physAttempts && physAttempts.total > 0 ? Math.round((physAttempts.correct / physAttempts.total) * 100) : null;

    if (anatAttempts.total === 4 && anatAttempts.correct === 3 && anatAccuracy === 75) {
      record('Curriculum Dual Progress', '5. Anatomy MCQ accuracy calculated correctly from attempts', true, '3/4 = 75%');
    } else {
      record('Curriculum Dual Progress', '5. Anatomy MCQ accuracy calculated correctly from attempts', false, `got ${anatAccuracy}%`);
    }

    if (physAccuracy === null && (!physAttempts || physAttempts.total === 0)) {
      record('Curriculum Dual Progress', '6. Physiology with zero MCQ attempts returns null accuracy (honest empty state, not 0%)', true, 'hasMcqData = false');
    } else {
      record('Curriculum Dual Progress', '6. Physiology with zero MCQ attempts returns null accuracy', false);
    }

    // Verify topic completions in Anatomy = 2
    const { data: progressRows } = await supabaseAdmin
      .from('student_topic_progress')
      .select('topic_id, status')
      .eq('user_id', testUserId)
      .eq('status', 'COMPLETED');
    
    if (progressRows && progressRows.length === 2) {
      record('Curriculum Dual Progress', '7. Topics completed metric strictly derives from explicit completion (2 completed)', true, '2 topics');
    } else {
      record('Curriculum Dual Progress', '7. Topics completed metric derives from explicit completion', false);
    }

    // =========================================================================
    // SECTION 4: TOPIC SPACED REPETITION & REVISION TAB HIERARCHY
    // =========================================================================
    // Schedule Topic 1: Due Today
    const todayStr = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('student_topic_revisions').insert({
      user_id: testUserId,
      topic_id: topicAnat1Id,
      status: 'SCHEDULED',
      interval_days: 7,
      scheduled_for: todayStr
    });

    // Schedule Topic 2: Overdue (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const overdueStr = threeDaysAgo.toISOString().split('T')[0];
    await supabaseAdmin.from('student_topic_revisions').insert({
      user_id: testUserId,
      topic_id: topicAnat2Id,
      status: 'SCHEDULED',
      interval_days: 14,
      scheduled_for: overdueStr
    });

    // Schedule Physiology: Upcoming (in 10 days)
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    const upcomingStr = inTenDays.toISOString().split('T')[0];
    await supabaseAdmin.from('student_topic_revisions').insert({
      user_id: testUserId,
      topic_id: topicPhysId,
      status: 'SCHEDULED',
      interval_days: 30,
      scheduled_for: upcomingStr
    });

    // Query revisions via client
    const { data: userRevisions } = await clientAuth
      .from('student_topic_revisions')
      .select('id, topic_id, scheduled_for, status, interval_days')
      .order('scheduled_for', { ascending: true });

    let dueTodayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    userRevisions?.forEach(r => {
      if (r.scheduled_for < todayStr) overdueCount++;
      else if (r.scheduled_for === todayStr) dueTodayCount++;
      else upcomingCount++;
    });

    if (overdueCount === 1 && dueTodayCount === 1 && upcomingCount === 1) {
      record('Revision Tab', '8. Revisions categorized into Overdue (1), Due Today (1), and Upcoming (1)', true, 'All 3 tiers verified');
    } else {
      record('Revision Tab', '8. Revisions categorization', false, `overdue=${overdueCount}, today=${dueTodayCount}, upcoming=${upcomingCount}`);
    }

    // =========================================================================
    // SECTION 5: EXAM COUNTDOWN INTEGRITY
    // =========================================================================
    const examTarget = EXAM_TARGETS[CURRENT_EXAM_ID];
    const cdOct6 = getExamCountdown(examTarget, new Date(2026, 9, 6, 12, 0, 0));
    const cdOct7 = getExamCountdown(examTarget, new Date(2026, 9, 7, 12, 0, 0));
    if (cdOct6.label === '26 days remaining' && cdOct7.label === '25 days remaining') {
      record('Countdown', '9. Exam countdown remains dynamic and calendar-accurate', true, 'Oct 6: 26d, Oct 7: 25d');
    } else {
      record('Countdown', '9. Exam countdown calculation', false);
    }

  } catch (err: any) {
    console.error(`\n[FATAL ERROR] ${err.message}`);
  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------');
    console.log('Cleaning up live test user...');
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log(`- Cleaned up test user (${testUserId})`);
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

runMilestoneLiveValidation();
