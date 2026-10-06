import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function validateDatabase() {
  console.log('========================================');
  console.log('ANDE MED DATABASE SETUP VALIDATION');
  console.log('========================================\n');

  if (!supabaseUrl || !supabaseKey) {
    console.log('STATUS: BLOCKED');
    console.log('Reason: EXPO_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are missing in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Connection & Schema
    console.log('Checking database connection...');
    const { error: connectionError } = await supabase.from('profiles').select('id').limit(1);
    
    if (connectionError && connectionError.code !== 'PGRST116') { // PGRST116 is no rows, which is fine
      if (connectionError.message.includes('fetch failed') || connectionError.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Database unreachable.');
      }
      if (connectionError.code === '42P01') {
         // table does not exist
      } else {
         throw connectionError;
      }
    }
    console.log('Connection: OK');

    // 2. Required Tables
    const requiredTables = [
      'profiles',
      'subjects',
      'topics',
      'subtopics',
      'questions',
      'question_options',
      'question_attempts',
      'topic_mastery',
      'subject_mastery',
      'revision_items',
      'student_topic_progress',
      'daily_missions',
      'mission_items',
      'ai_explanations',
      'integrated_concepts',
      'integrated_concept_links'
    ];

    const missingTables: string[] = [];
    console.log('\nChecking required tables...');

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code === '42P01') {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables.join(', '));
      console.log('\nSTATUS: INCOMPLETE');
      console.log('Please execute src/database/schema.sql in the Supabase SQL Editor.');
      process.exit(1);
    }
    console.log('All required tables exist: OK');

    // 3. Questions Status Check
    console.log('\nChecking question data...');
    const { data: mcqs, count: mcqCount, error: mcqError } = await supabase
      .from('questions')
      .select('id, status', { count: 'exact' });
      
    if (mcqError) throw mcqError;

    const publishedCount = mcqs?.filter(q => q.status === 'PUBLISHED').length || 0;
    const draftCount = mcqs?.filter(q => q.status === 'DRAFT').length || 0;

    console.log(`Total production MCQs: ${mcqCount}`);
    console.log(`Published: ${publishedCount}`);
    console.log(`Draft: ${draftCount}`);

    // 4. Curriculum Status Check
    console.log('\nChecking curriculum data...');
    const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
    const { count: topicCount } = await supabase.from('topics').select('*', { count: 'exact', head: true });

    console.log(`Subjects seeded: ${subjectCount || 0} / 19`);
    console.log(`Topics seeded: ${topicCount || 0} / 416`);

    if (subjectCount === 0 || topicCount === 0) {
      console.log('\nWarning: Curriculum is not seeded. Run scripts/seed-m13-1.ts');
    }

    console.log('\n========================================');
    console.log('STATUS: READY FOR DATA PIPELINE');
    console.log('========================================');

  } catch (err: any) {
    console.error('\nDatabase validation failed:');
    console.error(err.message || err);
    console.log('\nSTATUS: BLOCKED');
    process.exit(1);
  }
}

validateDatabase();
