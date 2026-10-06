import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDb() {
  console.log('--- VERIFY LIVE DATABASE ---');
  const { data: allQ, error: err1 } = await supabase.from('questions').select('id, status, subject_id, topic_id, import_id');
  if (err1) { console.error(err1); return; }

  const total = allQ.length;
  const published = allQ.filter(q => q.status === 'PUBLISHED');

  const { data: subjects } = await supabase.from('subjects').select('id, name, slug');
  const { data: topics } = await supabase.from('topics').select('id, name, slug');

  const anatomySubject = subjects?.find(s => s.slug === 'anatomy');
  if (!anatomySubject) {
    console.log('ERROR: Anatomy subject not found.');
    return;
  }

  const publishedAnatomy = published.filter(q => q.subject_id === anatomySubject.id);

  console.log('1. Total questions:', total);
  console.log('2. Total PUBLISHED questions:', published.length);
  console.log('3. Total PUBLISHED Anatomy questions:', publishedAnatomy.length);

  const topicCount: Record<string, number> = {};
  publishedAnatomy.forEach(q => {
    const topic = topics?.find(t => t.id === q.topic_id);
    const slug = topic ? topic.slug : 'unknown';
    topicCount[slug] = (topicCount[slug] || 0) + 1;
  });

  console.log('4. PUBLISHED questions per Anatomy topic:');
  for (const [slug, count] of Object.entries(topicCount)) {
    console.log(`   - ${slug}: ${count}`);
  }

  const strictAnatomyCount = publishedAnatomy.filter(q => 
    q.subject_id === anatomySubject.id &&
    q.topic_id &&
    q.status === 'PUBLISHED'
  ).length;

  console.log('5. Number of questions with subject_id=Anatomy, valid topic_id, status=PUBLISHED:', strictAnatomyCount);

  console.log('6. 3 actual published question IDs:');
  for (let i = 0; i < Math.min(3, publishedAnatomy.length); i++) {
    const q = publishedAnatomy[i];
    const topic = topics?.find(t => t.id === q.topic_id);
    console.log(`   - ID: ${q.id} | ImportID: ${q.import_id} | Topic: ${topic?.name} (${topic?.slug})`);
  }
}

verifyDb();
