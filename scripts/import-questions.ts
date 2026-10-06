import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface ImportOption {
  text: string;
  isCorrect: boolean;
  whyWrong?: string;
}

export interface ImportQuestion {
  importId: string;
  exam: string;
  subjectSlug: string;
  topicSlug: string;
  stem: string;
  options: ImportOption[];
  explanation?: string;
  keyLearningPoint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  examRelevance?: number;
  clinicalClassification?: 'clinical' | 'preclinical' | 'paraclinical' | 'integrated';
  provenance?: 'ORIGINAL' | 'LICENSED' | 'OTHER_AUTHORIZED';
  version?: number;
}

export function validateQuestionsData(
  questions: ImportQuestion[],
  subjectMap: Map<string, string>,
  topicMap: Map<string, any>,
  existingImportIds: Map<string, number>
) {
  let valid = 0;
  let invalid = 0;
  const validQuestionsToInsert: any[] = [];
  const report: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const errors: string[] = [];

    if (!q.importId || q.importId.trim() === '') errors.push('Missing importId');
    if (!q.stem || q.stem.trim() === '') errors.push('Blank stem');
    if (!q.exam) errors.push('Missing exam');
    
    // Validate Options
    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      errors.push('Must have at least 2 options');
    } else {
      const correctCount = q.options.filter(o => o.isCorrect === true).length;
      if (correctCount !== 1) {
        errors.push(`Must have exactly one correct option. Found ${correctCount}.`);
      }
      if (q.options.some(o => !o.text || o.text.trim() === '')) {
        errors.push('Option text cannot be blank');
      }
    }

    // Validate Curriculum Mapping
    const sId = subjectMap.get(q.subjectSlug);
    const tData = topicMap.get(q.topicSlug);

    if (!sId) {
      errors.push(`Invalid subject slug: ${q.subjectSlug}`);
    }
    if (!tData) {
      errors.push(`Invalid topic slug: ${q.topicSlug}`);
    } else if (sId && tData.subject_id !== sId) {
      errors.push(`Topic ${q.topicSlug} does not belong to subject ${q.subjectSlug}`);
    }

    // Validate Provenance
    if (q.provenance && !['ORIGINAL', 'LICENSED', 'OTHER_AUTHORIZED'].includes(q.provenance)) {
      errors.push(`Unsupported provenance: ${q.provenance}`);
    }

    // Duplicate detection
    if (q.importId && existingImportIds.has(q.importId)) {
      const existingVersion = existingImportIds.get(q.importId);
      if (q.version && q.version <= existingVersion!) {
        errors.push(`Duplicate external ID (importId: ${q.importId}) with version <= existing version.`);
      } else {
        errors.push(`Duplicate external ID (importId: ${q.importId}) exists in DB.`);
      }
    }

    if (errors.length > 0) {
      invalid++;
      report.push(`[Error] Question index ${i} (${q.importId || 'unknown'}): ${errors.join(' | ')}`);
    } else {
      valid++;
      validQuestionsToInsert.push({ ...q, subject_id: sId, topic_id: tData!.id });
    }
  }

  return { valid, invalid, validQuestionsToInsert, report };
}

async function validateAndImport(filePath: string, isDryRun: boolean) {
  console.log(`\n=== ANDE MED QUESTION IMPORT ===`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE IMPORT'}`);
  console.log(`File: ${filePath}\n`);

  let rawData: string;
  try {
    rawData = readFileSync(filePath, 'utf8');
  } catch (err: any) {
    console.error(`Failed to read file: ${err.message}`);
    process.exit(1);
  }

  let questions: ImportQuestion[];
  try {
    questions = JSON.parse(rawData);
  } catch (err: any) {
    console.error(`Invalid JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(questions)) {
    console.error(`Input file must contain a JSON array of questions.`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch live curriculum to validate mappings
  const { data: subjects } = await supabase.from('subjects').select('id, slug');
  const { data: topics } = await supabase.from('topics').select('id, subject_id, slug');

  if (!subjects || !topics) {
    console.error('Failed to fetch curriculum data from database.');
    process.exit(1);
  }

  const subjectMap = new Map(subjects.map(s => [s.slug, s.id]));
  const topicMap = new Map(topics.map(t => [t.slug, t]));

  // 2. Fetch existing import_ids for duplicate detection
  const { data: existingQ } = await supabase.from('questions').select('import_id, version');
  const existingImportIds = new Map(existingQ?.filter(q => q.import_id).map(q => [q.import_id, q.version]) || []);

  const { valid, invalid, validQuestionsToInsert, report } = validateQuestionsData(questions, subjectMap, topicMap, existingImportIds);

  report.forEach(r => console.log(r));

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total records: ${questions.length}`);
  console.log(`Valid: ${valid}`);
  console.log(`Invalid: ${invalid}`);
  
  if (isDryRun) {
    console.log(`Records that would be inserted: ${valid}`);
    console.log(`\nDRY-RUN COMPLETE. No data was modified.`);
    if (invalid > 0) process.exit(1);
    process.exit(0);
  }

  if (valid === 0) {
    console.log(`No valid questions to insert.`);
    process.exit(1);
  }

  console.log(`\nInserting ${valid} questions...`);

  // 3. Database Insertion
  for (const q of validQuestionsToInsert) {
    const { data: insertedQ, error: qError } = await supabase.from('questions').insert({
      import_id: q.importId,
      exam: q.exam,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      question_text: q.stem,
      explanation: q.explanation || null,
      key_learning_point: q.keyLearningPoint || null,
      difficulty: q.difficulty || 'medium',
      exam_relevance: q.examRelevance || 5,
      clinical_classification: q.clinicalClassification || null,
      provenance: q.provenance || 'ORIGINAL',
      status: 'DRAFT', // Enforce DRAFT
      version: q.version || 1
    }).select('id').single();

    if (qError || !insertedQ) {
      console.error(`Failed to insert question ${q.importId}: ${qError?.message}`);
      continue;
    }

    const optionsToInsert = q.options.map((o: any) => ({
      question_id: insertedQ.id,
      option_text: o.text,
      is_correct: o.isCorrect,
      why_wrong: o.whyWrong || null
    }));

    const { error: optError } = await supabase.from('question_options').insert(optionsToInsert);

    if (optError) {
      console.error(`Failed to insert options for question ${q.importId}: ${optError.message}`);
    }
  }

  console.log(`IMPORT COMPLETE.`);
}

const args = process.argv.slice(2);
const fileArgIdx = args.indexOf('--file');
const isDryRun = args.includes('--dry-run');

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('import-questions')) {
  if (fileArgIdx === -1 || !args[fileArgIdx + 1]) {
    console.error('Usage: npx tsx scripts/import-questions.ts --file <path.json> [--dry-run]');
    process.exit(1);
  }
  validateAndImport(args[fileArgIdx + 1], isDryRun);
}
