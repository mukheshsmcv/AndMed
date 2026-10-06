import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspectBug() {
  console.log("Inspecting Topic Completion Bug...\n");

  try {
    // 1. Fetch Topics
    const { data: topics, error: topicsError } = await supabaseAdmin
      .from('topics')
      .select('id, name, slug')
      .in('name', ['Head and Neck', 'Thorax']);
    
    if (topicsError) throw topicsError;
    console.log("Topics:");
    topics.forEach(t => console.log(`- ${t.name}: ID=${t.id}, slug=${t.slug}`));

    // 2. Fetch Progress records for these topics
    const topicIds = topics.map(t => t.id);
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('student_topic_progress')
      .select('*')
      .in('topic_id', topicIds);
      
    if (progressError) throw progressError;
    
    console.log("\nStudent Topic Progress rows:");
    progress.forEach(p => {
      const topicName = topics.find(t => t.id === p.topic_id)?.name;
      console.log(`- ${topicName}: user_id=${p.user_id}, status=${p.status}, manually_completed=${p.manually_completed}`);
    });

    console.log("\nSimulating /api/curriculum logic...");
    const userIds = Array.from(new Set(progress.map(p => p.user_id)));
    if (userIds.length === 0) {
      console.log("No users with progress to test.");
      return;
    }
    const testUser = userIds[0];

    const { data: userProgress } = await supabaseAdmin
      .from('student_topic_progress')
      .select('topic_id, status, updated_at')
      .eq('user_id', testUser);

    console.log(`Topic Progress for user ${testUser}:`, userProgress);

    const progressMap = new Map(userProgress?.map(tp => [tp.topic_id, { status: tp.status, updated_at: tp.updated_at }]) || []);
    
    topics.forEach(t => {
      console.log(`\nTopic: ${t.name} (ID: ${t.id})`);
      const pMap = progressMap.get(t.id) as any;
      console.log(`- pMap manualStatus:`, pMap?.status);
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

inspectBug();
