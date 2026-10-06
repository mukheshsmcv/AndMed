import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('Seeding M8 Content...');

  // 1. Subjects
  const subjects = ['Anatomy', 'Pathology', 'Pharmacology'];
  for (const s of subjects) {
    await supabase.from('subjects').upsert({ name: s }, { onConflict: 'name' });
  }

  const { data: subjData } = await supabase.from('subjects').select('id, name');
  const subjMap = Object.fromEntries(subjData!.map((s: any) => [s.name, s.id]));

  // 2. Topics
  const topics = [
    { subject: 'Anatomy', name: 'Upper Limb Anatomy' },
    { subject: 'Pathology', name: 'Neoplasia' },
    { subject: 'Pharmacology', name: 'Autonomic Nervous System' }
  ];

  for (const t of topics) {
    await supabase.from('topics').upsert(
      { subject_id: subjMap[t.subject], name: t.name },
      { onConflict: 'subject_id,name' }
    );
  }

  const { data: topicData } = await supabase.from('topics').select('id, name');
  const topicMap = Object.fromEntries(topicData!.map((t: any) => [t.name, t.id]));

  // 3. Questions
  const questions = [
    {
      exam: 'INI-CET',
      subject_id: subjMap['Anatomy'],
      topic_id: topicMap['Upper Limb Anatomy'],
      question_text: 'Which nerve passes through the quadrangular space?',
      explanation: 'The axillary nerve and posterior circumflex humeral artery pass through the quadrangular space.',
      key_learning_point: 'Axillary nerve = quadrangular space',
      difficulty: 'medium',
      exam_relevance: 8,
      clinical_classification: 'preclinical',
      provenance: 'ORIGINAL',
      status: 'PUBLISHED',
      options: [
        { text: 'Axillary nerve', isCorrect: true, why: '' },
        { text: 'Radial nerve', isCorrect: false, why: 'Radial nerve goes through the triangular interval' },
        { text: 'Median nerve', isCorrect: false, why: 'Passes down the arm' },
        { text: 'Ulnar nerve', isCorrect: false, why: 'Passes behind medial epicondyle' }
      ]
    },
    {
      exam: 'INI-CET',
      subject_id: subjMap['Pathology'],
      topic_id: topicMap['Neoplasia'],
      question_text: 'Which gene mutation is characteristic of Burkitt lymphoma?',
      explanation: 't(8;14) involves c-myc on chromosome 8 and IgH on chromosome 14.',
      key_learning_point: 'Burkitt = t(8;14) c-myc overexpression',
      difficulty: 'hard',
      exam_relevance: 9,
      clinical_classification: 'paraclinical',
      provenance: 'ORIGINAL',
      status: 'PUBLISHED',
      options: [
        { text: 'c-myc', isCorrect: true, why: '' },
        { text: 'bcl-2', isCorrect: false, why: 'Follicular lymphoma' },
        { text: 'bcl-6', isCorrect: false, why: 'Diffuse large B-cell lymphoma' },
        { text: 'cyclin D1', isCorrect: false, why: 'Mantle cell lymphoma' }
      ]
    },
    {
      exam: 'INI-CET',
      subject_id: subjMap['Pharmacology'],
      topic_id: topicMap['Autonomic Nervous System'],
      question_text: 'Which of the following is a non-selective beta blocker?',
      explanation: 'Propranolol blocks both beta-1 and beta-2 receptors.',
      key_learning_point: 'Propranolol = non-selective beta blocker',
      difficulty: 'easy',
      exam_relevance: 7,
      clinical_classification: 'paraclinical',
      provenance: 'ORIGINAL',
      status: 'PUBLISHED',
      options: [
        { text: 'Propranolol', isCorrect: true, why: '' },
        { text: 'Atenolol', isCorrect: false, why: 'Cardioselective (beta-1)' },
        { text: 'Metoprolol', isCorrect: false, why: 'Cardioselective (beta-1)' },
        { text: 'Nebivolol', isCorrect: false, why: 'Cardioselective with NO release' }
      ]
    },
    {
      exam: 'INI-CET',
      subject_id: subjMap['Anatomy'],
      topic_id: topicMap['Upper Limb Anatomy'],
      question_text: 'This question should not be visible as it is DRAFT',
      explanation: 'Draft explanation',
      key_learning_point: 'Draft',
      difficulty: 'medium',
      exam_relevance: 5,
      clinical_classification: 'preclinical',
      provenance: 'ORIGINAL',
      status: 'DRAFT',
      options: [
        { text: 'Yes', isCorrect: true, why: '' },
        { text: 'No', isCorrect: false, why: '' }
      ]
    }
  ];

  for (const q of questions) {
    const { data: insertedQ, error: qErr } = await supabase.from('questions').insert({
      exam: q.exam,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      explanation: q.explanation,
      key_learning_point: q.key_learning_point,
      difficulty: q.difficulty,
      exam_relevance: q.exam_relevance,
      clinical_classification: q.clinical_classification,
      provenance: q.provenance,
      status: q.status
    }).select().single();

    if (qErr) {
      console.error('Failed to insert question:', qErr.message);
      continue;
    }

    const ops = q.options.map(o => ({
      question_id: insertedQ.id,
      option_text: o.text,
      is_correct: o.isCorrect,
      why_wrong: o.why
    }));

    await supabase.from('question_options').insert(ops);
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
