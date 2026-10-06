import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
const envPath = resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("\n============================================================");
  console.log("  SETUP — Create Test User");
  console.log("============================================================");
  
  const testEmail = `testactivity${Date.now()}@andemed.test`;
  const testPassword = "testpassword123";

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.user) {
    console.error("  [FAIL] Could not create test user:", authError?.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`  >> Test user created: ${userId}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("  [FAIL] No session after signup");
    process.exit(1);
  }
  console.log("  OK: Test user signed in");

  // Get a real topic ID
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name')
    .limit(1);
    
  if (topicsError || !topics || topics.length === 0) {
    console.error("  [FAIL] Could not fetch a topic to test with.");
    process.exit(1);
  }
  const topic = topics[0];
  console.log(`  >> Using topic: "${topic.name}" (${topic.id})`);

  console.log("\n============================================================");
  console.log("  TEST 1 — ACTIVE SESSION (API & DB)");
  console.log("============================================================");
  
  // 1. Insert ACTIVE session
  const now = new Date();
  const { data: activeInsert, error: activeErr } = await supabase
    .from('student_topic_sessions')
    .insert({
      user_id: userId,
      topic_id: topic.id,
      status: 'ACTIVE',
      started_at: now.toISOString(),
      duration_seconds: 0
    })
    .select()
    .single();

  if (activeErr) {
    console.error("  [FAIL] Could not insert ACTIVE session:", activeErr.message);
    process.exit(1);
  }
  console.log("  OK: ACTIVE session inserted directly into DB");
  
  const { data: activeQuery } = await supabase
    .from('student_topic_sessions')
    .select('id, started_at, topic_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeQuery && activeQuery.id === activeInsert.id) {
    console.log("  OK: ACTIVE session query returns the expected session.");
  } else {
    console.error("  [FAIL] ACTIVE session query failed.");
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log("  TEST 2 — COMPLETE SESSION (>= 60s)");
  console.log("============================================================");

  // 2. Complete the session
  const durationSeconds = 120;
  const endedAt = new Date(now.getTime() + durationSeconds * 1000);
  
  const { error: completeErr } = await supabase
    .from('student_topic_sessions')
    .update({
      status: 'COMPLETED',
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds
    })
    .eq('id', activeInsert.id);

  if (completeErr) {
    console.error("  [FAIL] Could not complete session:", completeErr.message);
    process.exit(1);
  }
  console.log(`  OK: Session completed with duration ${durationSeconds}s`);

  // 3. Verify Today/Recent Queries
  const { data: completedSessions } = await supabase
    .from('student_topic_sessions')
    .select('id, started_at, duration_seconds')
    .eq('user_id', userId)
    .eq('status', 'COMPLETED')
    .gte('duration_seconds', 60);

  if (completedSessions && completedSessions.length === 1 && completedSessions[0].id === activeInsert.id) {
    console.log("  OK: Completed session successfully found in >=60s filter.");
    console.log(`  OK: Session duration is ${completedSessions[0].duration_seconds}s.`);
  } else {
    console.error("  [FAIL] Completed session query failed.");
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log("  TEST 3 — IGNORE < 60s SESSIONS");
  console.log("============================================================");

  // Insert a short session
  const { error: shortErr } = await supabase
    .from('student_topic_sessions')
    .insert({
      user_id: userId,
      topic_id: topic.id,
      status: 'COMPLETED',
      started_at: now.toISOString(),
      ended_at: new Date(now.getTime() + 30 * 1000).toISOString(),
      duration_seconds: 30
    });

  if (shortErr) {
    console.error("  [FAIL] Could not insert short session:", shortErr.message);
    process.exit(1);
  }
  console.log("  >> Inserted 30s session (should NOT appear in history)");

  const { data: checkSessions } = await supabase
    .from('student_topic_sessions')
    .select('id, duration_seconds')
    .eq('user_id', userId)
    .eq('status', 'COMPLETED')
    .gte('duration_seconds', 60);

  if (checkSessions && checkSessions.length === 1) {
    console.log("  OK: <60s session correctly ignored in Recent/Today query.");
  } else {
    console.error(`  [FAIL] Expected 1 session >=60s, found ${checkSessions?.length}`);
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log("  FINAL SUMMARY");
  console.log("============================================================");
  console.log("  [PASS] ACTIVE session creation and querying works.");
  console.log("  [PASS] Session completion and duration updates correctly.");
  console.log("  [PASS] >60s filter successfully includes valid study sessions.");
  console.log("  [PASS] <60s filter successfully excludes short clicks.");
  
  console.log("\n  M19 STUDY ACTIVITY TESTS — ALL PASS");

  // Cleanup
  console.log("\n  Cleaning up test user...");
  // Use service role for deletion if available, otherwise just leave it.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const adminSupabase = createClient(supabaseUrl, serviceKey);
    await adminSupabase.auth.admin.deleteUser(userId);
    console.log("  Cleanup done.");
  } else {
    console.log("  No service role key; test user remains in DB.");
  }

  process.exit(0);
}

runTests().catch(console.error);