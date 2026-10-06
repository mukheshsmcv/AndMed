import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get Anatomy subject
  const { data: anatomySubject } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', 'anatomy')
    .single();

  if (!anatomySubject) {
    console.error('Anatomy subject not found.');
    process.exit(1);
  }

  // Get all topics for Anatomy
  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name, slug, parent_topic_id, display_order, active')
    .eq('subject_id', anatomySubject.id)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching topics:', error);
    process.exit(1);
  }

  console.log(JSON.stringify({
    subject: anatomySubject,
    topics: topics
  }, null, 2));
}

run();
