import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function upsertSubject(name: string, slug: string, year: string, display_order: number) {
  const { data, error } = await supabase
    .from('subjects')
    .upsert(
      { name, slug, academic_year: year, display_order, active: true },
      { onConflict: 'name' }
    )
    .select('id')
    .single();
    
  if (error) throw new Error(`Error upserting subject ${name}: ${error.message}`);
  return data.id;
}

async function upsertTopic(subjectId: string, name: string, slug: string, display_order: number) {
  const { data, error } = await supabase
    .from('topics')
    .upsert(
      { subject_id: subjectId, name, slug, display_order, active: true },
      { onConflict: 'subject_id, name' }
    )
    .select('id')
    .single();
    
  if (error) throw new Error(`Error upserting topic ${name}: ${error.message}`);
  return data.id;
}

async function seed() {
  console.log('Seeding M13 Curriculum...');

  try {
    // 1st Year
    const anatomyId = await upsertSubject('Anatomy', 'anatomy', 'YEAR_1', 1);
    const physioId = await upsertSubject('Physiology', 'physiology', 'YEAR_1', 2);
    const biochemId = await upsertSubject('Biochemistry', 'biochemistry', 'YEAR_1', 3);

    // 2nd Year
    const pathId = await upsertSubject('Pathology', 'pathology', 'YEAR_2', 4);
    const pharmId = await upsertSubject('Pharmacology', 'pharmacology', 'YEAR_2', 5);
    const microId = await upsertSubject('Microbiology', 'microbiology', 'YEAR_2', 6);
    const fmtId = await upsertSubject('Forensic Medicine & Toxicology', 'forensic-medicine', 'YEAR_2', 7);

    // 3rd Year / Clinical
    const medId = await upsertSubject('General Medicine', 'medicine', 'YEAR_3', 8);
    const surgId = await upsertSubject('General Surgery', 'surgery', 'YEAR_3', 9);
    const obgId = await upsertSubject('Obstetrics & Gynaecology', 'obgyn', 'YEAR_3', 10);
    const pedsId = await upsertSubject('Pediatrics', 'pediatrics', 'YEAR_3', 11);
    const orthoId = await upsertSubject('Orthopedics', 'orthopedics', 'YEAR_3', 12);
    const entId = await upsertSubject('ENT', 'ent', 'YEAR_3', 13);
    const ophthaId = await upsertSubject('Ophthalmology', 'ophthalmology', 'YEAR_3', 14);
    const dermaId = await upsertSubject('Dermatology', 'dermatology', 'YEAR_3', 15);
    const psychId = await upsertSubject('Psychiatry', 'psychiatry', 'YEAR_3', 16);
    const radioId = await upsertSubject('Radiology', 'radiology', 'YEAR_3', 17);
    const anesId = await upsertSubject('Anaesthesiology', 'anaesthesiology', 'YEAR_3', 18);
    const psmId = await upsertSubject('Community Medicine / PSM', 'psm', 'YEAR_3', 19);

    // Pathology Topics
    const pathTopics = [
      'General Pathology', 'Cell Injury', 'Inflammation', 'Healing and Repair', 'Hemodynamic Disorders', 
      'Immunopathology', 'Neoplasia', 'Genetic Disorders', 'Hematology', 'RBC Disorders', 'WBC Disorders'
    ];
    for (let i = 0; i < pathTopics.length; i++) {
      await upsertTopic(pathId, pathTopics[i], `pathology-${pathTopics[i].toLowerCase().replace(/ /g, '-')}`, i + 1);
    }

    // Pharmacology Topics
    const pharmTopics = [
      'General Pharmacology', 'Autonomic Nervous System', 'CNS Pharmacology', 'Cardiovascular Drugs', 
      'Endocrine Pharmacology', 'GI Pharmacology', 'Respiratory Pharmacology', 'Antimicrobials'
    ];
    for (let i = 0; i < pharmTopics.length; i++) {
      await upsertTopic(pharmId, pharmTopics[i], `pharmacology-${pharmTopics[i].toLowerCase().replace(/ /g, '-')}`, i + 1);
    }
    
    // Additional placeholders for others as per requirement
    await upsertTopic(anatomyId, 'Upper Limb', 'anatomy-upper-limb', 1);
    await upsertTopic(physioId, 'Cardiovascular System', 'physiology-cvs', 1);
    await upsertTopic(obgId, 'Endometriosis', 'obg-endometriosis', 1);
    
    console.log('Curriculum seeded successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
  }
}

seed();
