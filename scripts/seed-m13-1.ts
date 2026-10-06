import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';
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

export const curriculum = [
  {
    subject: { name: 'Anatomy', slug: 'anatomy', year: 'YEAR_1', order: 1 },
    topics: [
      'General Anatomy', 'Lower Limb', 'Thorax', 'Abdomen', 'Pelvis and Perineum', 
      'Head and Neck', 'Neuroanatomy', 'Embryology', 'Histology', 'Genetics / Developmental Anatomy', 
      'Radiological Anatomy', 'Surface Anatomy', 'Applied Anatomy', 'Upper Limb'
    ]
  },
  {
    subject: { name: 'Physiology', slug: 'physiology', year: 'YEAR_1', order: 2 },
    topics: [
      'General Physiology', 'Cell Physiology', 'Blood', 'Nerve and Muscle', 'Cardiovascular System',
      'Respiratory System', 'Gastrointestinal System', 'Renal Physiology', 'Endocrinology',
      'Reproductive Physiology', 'CNS', 'Special Senses', 'Environmental Physiology',
      'Exercise Physiology', 'Aging', 'Integrated Physiology'
    ]
  },
  {
    subject: { name: 'Biochemistry', slug: 'biochemistry', year: 'YEAR_1', order: 3 },
    topics: [
      'Biomolecules', 'Carbohydrate Metabolism', 'Lipid Metabolism', 'Protein and Amino Acid Metabolism',
      'Nucleotide Metabolism', 'Molecular Biology', 'DNA Replication', 'Transcription', 'Translation',
      'Genetics', 'Vitamins', 'Minerals', 'Enzymes', 'Clinical Biochemistry', 'Nutrition',
      'Heme Metabolism', 'Detoxification', 'Inborn Errors of Metabolism'
    ]
  },
  {
    subject: { name: 'Pathology', slug: 'pathology', year: 'YEAR_2', order: 4 },
    topics: [
      'General Pathology', 'Cell Injury', 'Inflammation', 'Healing and Repair', 'Hemodynamic Disorders',
      'Immunopathology', 'Neoplasia', 'Genetic Disorders', 'Environmental/Nutritional Pathology',
      'Infectious Disease Pathology', 'Hematology', 'RBC Disorders', 'WBC Disorders', 
      'Platelet/coagulation disorders', 'Cardiovascular Pathology', 'Respiratory Pathology', 
      'Gastrointestinal Pathology', 'Hepatobiliary Pathology', 'Renal Pathology', 'Endocrine Pathology',
      'Reproductive Pathology', 'Breast Pathology', 'CNS Pathology', 'Bone/Soft Tissue Pathology', 'Skin Pathology',
      'Pediatric Pathology', 'Molecular Pathology', 'Cytopathology', 'Histopathology', 'Autopsy / systemic pathology concepts'
    ]
  },
  {
    subject: { name: 'Pharmacology', slug: 'pharmacology', year: 'YEAR_2', order: 5 },
    topics: [
      'General Pharmacology', 'Pharmacokinetics', 'Pharmacodynamics', 'Autonomic Nervous System',
      'Cholinergic drugs', 'Adrenergic drugs', 'CNS pharmacology', 'Cardiovascular pharmacology',
      'Renal pharmacology', 'Respiratory pharmacology', 'GI pharmacology', 'Endocrine pharmacology',
      'Reproductive pharmacology', 'Antimicrobials', 'Antitubercular drugs', 'Antileprosy drugs',
      'Antifungals', 'Antivirals', 'Antimalarials', 'Antiprotozoals', 'Anticancer drugs',
      'Immunosuppressants', 'Drugs affecting blood', 'Toxicology-related pharmacology', 'NSAIDs',
      'Steroids', 'Anesthetics', 'Vitamins', 'Miscellaneous/high-yield drugs', 'Anticholinergic Drugs',
      'Antiadrenergic Drugs', 'Antiepileptics', 'Antipsychotics', 'Antidepressants', 'Opioids',
      'Antihypertensives', 'Antianginal Drugs', 'Antiarrhythmics', 'Heart Failure Drugs', 'Diuretics',
      'Antidiabetic Drugs', 'Thyroid Drugs', 'Anthelmintics', 'Immunopharmacology', 'Drugs in pregnancy',
      'Pharmacogenetics', 'Clinical Pharmacology'
    ]
  },
  {
    subject: { name: 'Microbiology', slug: 'microbiology', year: 'YEAR_2', order: 6 },
    topics: [
      'General Microbiology', 'Immunology', 'Bacteriology', 'Gram Positive Bacteria', 'Gram Negative Bacteria',
      'Mycobacteria', 'Spirochetes', 'Atypical Bacteria', 'Virology', 'DNA Viruses', 'RNA Viruses',
      'Retroviruses', 'Hepatitis Viruses', 'Respiratory Viruses', 'Arboviruses', 'Rabies', 'Mycology',
      'Parasitology', 'Protozoa', 'Helminths', 'Medical Entomology', 'Systemic infections', 'Important organisms',
      'Laboratory diagnosis', 'Antimicrobial susceptibility', 'Infection control', 'Sterilization/disinfection',
      'Vaccines', 'Opportunistic infections', 'Hospital-acquired infections', 'Diagnostic Microbiology'
    ]
  },
  {
    subject: { name: 'Forensic Medicine & Toxicology', slug: 'forensic-medicine', year: 'YEAR_2', order: 7 },
    topics: [
      'Basics and Definitions of Legal Procedures', 'Courts and Evidence', 'Consent, Inquest and Negligence',
      'Examination of a Sexual Assault Victim and Accused', 'Legal Sections, POCSO and Sexual Paraphilias',
      'Identification', 'Odontology', 'Age', 'Fingerprints, Stature and Miscellaneous', 
      'Introduction to Thanatology and Types of Autopsy', 'Postmortem Changes', 'Miscellaneous Topics in Thanatology',
      'Fetal Death and Starvation', 'Mechanical Injuries', 'Skull Fractures', 'Forensic Ballistics: Internal Ballistics',
      'Forensic Ballistics: Range of Firearm Injuries', 'Thermal and Electrical Injuries', 'Medicolegal Aspects of Injuries',
      'Introduction to Asphyxia and Hanging', 'Strangulation and Drowning', 'General Toxicology', 
      'Alcohol and Pharmaceutical Poisoning', 'Corrosives', 'Agricultural and Cardiac Poisons', 'NDPS Poisons',
      'Deliriant and Vegetable Poisons', 'Metallic Poisons', 'Animal Toxins', 'Phosphorus and Spinal Poisons',
      'Trace Evidence', 'New Legal Sections'
    ]
  },
  {
    subject: { name: 'General Medicine', slug: 'medicine', year: 'YEAR_3', order: 8 },
    topics: [
      'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Hepatology', 'Renal', 'Neurology',
      'Endocrinology', 'Rheumatology', 'Hematology', 'Infectious Diseases', 'Oncology',
      'Emergency Medicine', 'Critical Care', 'Geriatric Medicine', 'Miscellaneous/Internal Medicine',
      'GIT Disorders', 'Respiratory System Disorders', 'CNS Disorders', 'CVS Disorders',
      'Renal Disorders', 'Endocrine Disorders', 'Paediatric Oncology'
    ]
  },
  {
    subject: { name: 'General Surgery', slug: 'surgery', year: 'YEAR_3', order: 9 },
    topics: [
      'General Surgery Principles', 'Wounds and Wound Healing', 'Shock', 'Fluids and Electrolytes',
      'Surgical Infections', 'Trauma', 'Burns', 'GI Surgery', 'Hepatobiliary Surgery',
      'Pancreatic Surgery', 'Colorectal Surgery', 'Breast', 'Thyroid', 'Parathyroid', 'Adrenal',
      'Vascular Surgery', 'Urology', 'Neurosurgery', 'Pediatric Surgery', 'Transplantation',
      'Surgical Oncology', 'Miscellaneous Surgery'
    ]
  },
  {
    subject: { name: 'Obstetrics & Gynaecology', slug: 'obgyn', year: 'YEAR_3', order: 10 },
    topics: [
      'Anatomy of Female Genital Tract', 'Embryology', 'Congenital Mullerian Malformation', 'Reproductive Physiology',
      'Menstruation', 'Puberty', 'Amenorrhea', 'PCOS', 'Infertility', 'Menopause and HRT', 'Endometriosis',
      'Fibroid', 'CIN', 'Ovarian Carcinoma', 'Endometrial Cancer and Endometrial Hyperplasia', 
      'Gestational Trophoblastic Neoplasia', 'Prolapse', 'Genital Fistula', 'Vaginitis and Cervicitis',
      'Pelvic Inflammatory Disease and Genital TB', 'Vulval Cancer', 'Natural and Barrier Methods of Contraception',
      'Hormonal Contraception', 'Long Acting Reversible Contraceptives', 'Emergency Contraception', 'Permanent Sterilization'
    ]
  },
  {
    subject: { name: 'Pediatrics', slug: 'pediatrics', year: 'YEAR_3', order: 11 },
    topics: [
      'Growth', 'Development', 'Nutrition', 'Genetics', 'Neonatology', 'Respiratory Disorders',
      'Gastrointestinal Disorders', 'CNS Disorders', 'Cardiovascular Disorders', 'Pediatric Infections',
      'Pediatric Emergencies', 'Pediatric Hematology/Oncology'
    ]
  },
  {
    subject: { name: 'Orthopedics', slug: 'orthopedics', year: 'YEAR_3', order: 12 },
    topics: [
      'General Orthopedics', 'Trauma', 'Fractures', 'Dislocations', 'Bone Tumors', 'Bone Infections',
      'Arthritis', 'Spine', 'Pediatric Orthopedics', 'Peripheral Nerve Injuries', 'Sports Injuries',
      'Metabolic Bone Disease', 'Hand', 'Foot and Ankle'
    ]
  },
  {
    subject: { name: 'ENT', slug: 'ent', year: 'YEAR_3', order: 13 },
    topics: [
      'Anatomy of Ear – External Ear', 'Investigations', 'Ear Inflammation', 'Non-infective Diseases of Ear',
      'Throat Anatomy', 'Diseases of Throat', 'Laryngopharynx and Its Diseases', 'Laryngeal Growth',
      'Nose and Sinuses', 'Diseases of Nose and Sinuses'
    ]
  },
  {
    subject: { name: 'Ophthalmology', slug: 'ophthalmology', year: 'YEAR_3', order: 14 },
    topics: [
      'Anatomy', 'Physiology', 'Optics', 'Refraction', 'Cataract', 'Glaucoma', 'Cornea', 'Uvea', 'Retina',
      'Neuro-ophthalmology', 'Squint', 'Pediatric Ophthalmology', 'Ocular Trauma', 'Orbit', 'Eyelids',
      'Lacrimal System', 'Conjunctiva', 'Ocular Tumors', 'Community Ophthalmology'
    ]
  },
  {
    subject: { name: 'Dermatology', slug: 'dermatology', year: 'YEAR_3', order: 15 },
    topics: [
      'Introduction to Dermatology and Layers of Skin', 'Epidermal Cells', 'Introduction to Common Skin Conditions',
      'Adnexal Disorders', 'Melanin Disorders', 'Skin Cancers', 'Facial Skin Lesions', 'Alopecia', 'Mast Cell Disorders',
      'Wood’s Lamp Examination', 'Miscellaneous Inflammatory Dermatoses', 'Dermoepidermal Junction and Direct Immunofluorescence',
      'Scalp Hair Cycle', 'Nail Diseases', 'Cutaneous TB and Erythema Nodosum', 'Drug Reactions', 'Hansen’s Disease',
      'Sexually Transmitted Diseases', 'Psoriasis', 'Lichen Planus', 'Fungal Skin Infections', 'Viral Skin Infections',
      'Parasitic Skin Infections', 'Eczema', 'Blistering Disorders'
    ]
  },
  {
    subject: { name: 'Psychiatry', slug: 'psychiatry', year: 'YEAR_3', order: 16 },
    topics: [
      'General Psychiatry', 'Psychiatric Assessment', 'Psychopathology', 'Schizophrenia', 'Mood Disorders',
      'Anxiety Disorders', 'OCD', 'Somatoform Disorders', 'Substance Use Disorders', 'Personality Disorders',
      'Child Psychiatry', 'Sleep Disorders', 'Sexual Disorders', 'Psychiatric Emergencies', 'Psychopharmacology',
      'Psychotherapy', 'Forensic Psychiatry'
    ]
  },
  {
    subject: { name: 'Radiology', slug: 'radiology', year: 'YEAR_3', order: 17 },
    topics: [
      'Basics of Investigation', 'Basics of Radiography', 'Mammography', 'Radiation Hazards and Protection',
      'Ultrasonography', 'CT Scan', 'MRI', 'Nuclear Scans', 'PET Scan', 'Contrast Agents in Radiology',
      'Radiotherapy', 'Neuro Radiology', 'Head and Neck Radiology', 'Thoracic and Cardiovascular Radiology',
      'Abdominal Radiology', 'Genitourinary Imaging', 'Women’s Imaging', 'Musculoskeletal Radiology', 'Test Images'
    ]
  },
  {
    subject: { name: 'Anaesthesiology', slug: 'anaesthesiology', year: 'YEAR_3', order: 18 },
    topics: [
      'Preoperative Assessment', 'General Anesthesia', 'Regional Anesthesia', 'Airway Management',
      'Monitoring', 'Ventilation', 'Fluids and Electrolytes', 'Blood Transfusion', 'Pain Medicine',
      'Critical Care', 'CPR', 'Anesthetic Drugs', 'Complications of Anesthesia', 'Pediatric Anesthesia',
      'Obstetric Anesthesia'
    ]
  },
  {
    subject: { name: 'Community Medicine / PSM', slug: 'psm', year: 'YEAR_3', order: 19 },
    topics: [
      'Health Indicators', 'Infectious Disease Epidemiology', 'Levels of Prevention', 'Vaccines',
      'Study Designs', 'Health Programmes', 'Communicable Diseases', 'Screening', 'Biostatistics',
      'Demography and Family Planning', 'Contraception', 'MCH Indicators', 'Nutrition', 'Environment and Health',
      'Entomology', 'Occupational Health', 'Non Communicable Diseases', 'Health Education and Communication',
      'Behavioural and Social Sciences', 'Health Planning and Management', 'Health Planning in India',
      'Sources of Demographic Information in India', 'Health Care Delivery System', 'Biomedical Waste Management',
      'Disaster Management', 'International Health', 'Practice Questions'
    ]
  }
];

export function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function seed() {
  console.log('Seeding M13.1 Curriculum...');

  try {
    for (const data of curriculum) {
      const subjectId = await upsertSubject(
        data.subject.name, 
        data.subject.slug, 
        data.subject.year, 
        data.subject.order
      );

      for (let i = 0; i < data.topics.length; i++) {
        const topicName = data.topics[i];
        const topicSlug = slugify(`${data.subject.slug}-${topicName}`);
        await upsertTopic(subjectId, topicName, topicSlug, i + 1);
      }
    }
    
    console.log('Curriculum M13.1 seeded successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
  }
}

seed();
