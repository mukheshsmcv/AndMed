# MBBS Curriculum Architecture (M13)

## 1. Overview
The canonical curriculum groups topics into medical subjects, and subjects into Academic Years (`academic_year`).
This is primarily a UI and grouping construct. The adaptive engine is fully cross-curricular and treats all subjects as an integrated whole, but students can drill down by year.

## 2. Subject Metadata
- **academic_year**: e.g., 'YEAR_1', 'YEAR_2', 'YEAR_3'
- **display_order**: integer for predictable UI sorting.
- **slug**: canonical identifier (e.g., 'pathology').

## 3. Topic & Subtopic Metadata
- **parent_topic_id**: Allows topics to have sub-topics without breaking the rigid M8 hierarchy (Subject -> Topic -> Subtopic).
- **slug**: canonical identifier (e.g., 'cell-injury').
- **clinical_classification**: 'clinical', 'preclinical', 'paraclinical', 'integrated' (e.g. Pathology is paraclinical).
- **exam_relevance**: (1-10) Indicates high-yield vs low-yield topics.

## 4. Academic Years

### YEAR_1
- Anatomy
- Physiology
- Biochemistry

### YEAR_2
- Pathology
- Pharmacology
- Microbiology
- Forensic Medicine & Toxicology

### YEAR_3 / CLINICAL
- General Medicine
- General Surgery
- Obstetrics & Gynaecology
- Pediatrics
- Orthopedics
- ENT
- Ophthalmology
- Dermatology
- Psychiatry
- Radiology
- Anaesthesiology
- Community Medicine / PSM

## 5. Curriculum Content Generation
The system supports structured seeding scripts (e.g., `seed-m13.ts`) which use deterministic slugs, ensuring idempotency.
It covers exhaustive topics for Pathology, Pharmacology, Microbiology, FMT, OBG, ENT, Dermatology, PSM, Pediatrics, and Radiology according to the standard syllabus.
