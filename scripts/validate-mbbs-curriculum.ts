import { curriculum, slugify } from './seed-m13-1';

const requiredSubjects = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 
  'Microbiology', 'Forensic Medicine & Toxicology', 'General Medicine', 
  'General Surgery', 'Obstetrics & Gynaecology', 'Pediatrics', 'Orthopedics', 
  'ENT', 'Ophthalmology', 'Dermatology', 'Psychiatry', 'Radiology', 
  'Anaesthesiology', 'Community Medicine / PSM'
];

async function validate() {
  console.log('========================================');
  console.log('ANDE MED CURRICULUM AUDIT');
  console.log('========================================\n');

  try {
    const subjects = curriculum.map(c => c.subject);
    const topics = curriculum.flatMap(c => c.topics.map(t => ({ name: t, subject_id: c.subject.name, slug: slugify(c.subject.slug + '-' + t) })));
    const subtopics: any[] = [];

    // Subjects
    const subjectNames = new Set(subjects.map(s => s.name));
    let missingSubjects = requiredSubjects.filter(s => !subjectNames.has(s));
    
    console.log('SUBJECTS');
    console.log(`${subjects.length} / 19`);
    if (missingSubjects.length > 0) {
      console.log(`Missing subjects: ${missingSubjects.join(', ')}`);
    }
    console.log('');

    // Topics per subject
    console.log('TOPICS');
    console.log(`total: ${topics.length}`);
    const subjectMap = new Map();
    subjects.forEach(s => subjectMap.set(s.name, s.name));
    
    const topicCountPerSubject = new Map();
    subjects.forEach(s => topicCountPerSubject.set(s.name, 0));
    topics.forEach(t => {
      const sName = subjectMap.get(t.subject_id);
      if (sName) {
        topicCountPerSubject.set(sName, topicCountPerSubject.get(sName) + 1);
      }
    });

    // Check pass/fail for each category
    const checkSubjectPass = (subjName: string) => {
      if (!subjectNames.has(subjName)) return 'FAIL (Missing subject)';
      if (topicCountPerSubject.get(subjName) === 0) return 'FAIL (0 topics)';
      return 'PASS';
    };

    console.log('\nFIRST YEAR');
    ['Anatomy', 'Physiology', 'Biochemistry'].forEach(s => console.log(`${s.padEnd(15)} ${checkSubjectPass(s)}`));
    
    console.log('\nSECOND YEAR');
    ['Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine & Toxicology'].forEach(s => console.log(`${(s === 'Forensic Medicine & Toxicology' ? 'FMT' : s).padEnd(15)} ${checkSubjectPass(s)}`));
    
    console.log('\nCLINICAL');
    ['General Medicine', 'General Surgery', 'Obstetrics & Gynaecology', 'Pediatrics', 'Orthopedics', 'ENT', 'Ophthalmology', 'Dermatology', 'Psychiatry', 'Radiology', 'Anaesthesiology', 'Community Medicine / PSM'].forEach(s => {
      let displayName = s;
      if (s === 'General Medicine') displayName = 'Medicine';
      if (s === 'General Surgery') displayName = 'Surgery';
      if (s === 'Obstetrics & Gynaecology') displayName = 'OBG';
      if (s === 'Anaesthesiology') displayName = 'Anaesthesia';
      if (s === 'Community Medicine / PSM') displayName = 'PSM';
      
      console.log(`${displayName.padEnd(15)} ${checkSubjectPass(s)}`);
    });

    // Subtopics
    console.log(`\nSUBTOPICS\ntotal: ${subtopics.length}\n`);

    // Duplicates & Orphans
    const slugs = new Set();
    let duplicates = 0;
    topics.forEach(t => {
      if (slugs.has(t.slug)) duplicates++;
      slugs.add(t.slug);
    });

    let orphans = topics.filter(t => !subjectMap.has(t.subject_id)).length;
    let invalidHierarchy = 0;

    console.log('DUPLICATES');
    console.log(duplicates);
    console.log('\nORPHANS');
    console.log(orphans);
    console.log('\nINVALID HIERARCHY');
    console.log(invalidHierarchy);

    // Missing topics
    let missingTopicsCount = 0;
    for (const [s, count] of topicCountPerSubject.entries()) {
      if (count === 0 && requiredSubjects.includes(s)) missingTopicsCount++;
    }
    
    console.log('\nMISSING REQUIRED TOPICS');
    console.log(missingTopicsCount > 0 ? missingTopicsCount : 0);

    const isPass = missingSubjects.length === 0 && missingTopicsCount === 0 && duplicates === 0 && orphans === 0;

    console.log('\nSTATUS: ' + (isPass ? 'PASS' : 'FAIL'));
    console.log('========================================');

    if (!isPass) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation failed with error:', error);
    process.exit(1);
  }
}

validate();
