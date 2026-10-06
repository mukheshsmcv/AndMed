# ANDE MED Question Quality Standard

> **Version 1.0 — M13.5**
> This document defines the production standard for all MCQs entering the ANDE MED system.
> No question may be promoted past `DRAFT` without satisfying the criteria in this document.

---

## 1. Question Stem Standard

The stem is the clinical scenario or factual setup that frames the single question being asked.

### Required
- Written in clear, unambiguous English.
- Presents exactly one clinical scenario or concept per question.
- Ends with a direct question or an incomplete sentence requiring completion.
- Avoids negatively phrased stems ("Which of the following is NOT...") unless the negative is the specific learning objective. If used, the negative word must be **bolded or capitalised**.
- Clinical vignettes must include: age, sex, presenting complaint, relevant clinical findings, and the specific decision point.
- Does not include the answer or a major discriminating clue within the stem itself.
- Free from unnecessary filler. Keep the scenario tight.

### Recommended Length
| Type | Target |
|---|---|
| Rapid factual recall | 1–2 sentences |
| Mechanism/concept | 2–4 sentences |
| Clinical vignette | 4–8 sentences |
| Integrated/image | 4–10 sentences |

---

## 2. Option Standard

Every question uses the **single-best-answer (SBA)** format.

### Required
- Minimum **4 options**, maximum **5 options**.
- Exactly **one** option is the single best correct answer.
- All options are **grammatically parallel** (e.g., all nouns, all drug names, all mechanisms).
- Option length is approximately equal; a significantly longer correct option is an inadvertent clue.
- Options are ordered logically: alphabetically, numerically, or by clinical sequence.
- No "all of the above" or "none of the above."
- No "both A and C" or combination options.

---

## 3. Single-Best-Answer Construction

ANDE MED uses SBA exclusively. This means:

- There is always one **clearly superior** correct answer.
- Distractors are plausible but clearly incorrect when the discriminating concept is known.
- If two options are both defensible, the question is **ambiguous and must be rejected** at review.
- The SBA should reflect clinical or conceptual best practice, not an obscure exception.

---

## 4. Question Type Taxonomy

| Type | Code | Description |
|---|---|---|
| Single Best Answer — Factual | `FACTUAL` | Tests direct recall of a fact, value, or association |
| Clinical Vignette | `VIGNETTE` | Presents a patient case requiring diagnosis, investigation, or management |
| Mechanism / Concept | `MECHANISM` | Tests understanding of a pathophysiological or pharmacological principle |
| Investigation Interpretation | `INVESTIGATION` | Interprets lab values, imaging findings, or ECG patterns |
| Pharmacology / Application | `PHARMA` | Tests drug selection, mechanism of action, adverse effects, or interactions |
| Pathology Correlation | `PATHOLOGY` | Correlates histology, gross pathology, or autopsy findings |
| Integrated Multi-Subject | `INTEGRATED` | Crosses at least two canonical subjects (e.g., anatomy + physiology) |
| Image Interpretation | `IMAGE` | Requires visual interpretation of a labelled clinical image |

> **Note on IMAGE questions:** Image must be attached as a vetted, rights-cleared asset. Images from copyrighted atlases require explicit licensing.

---

## 5. Difficulty Standard

Difficulty is assigned based on **cognitive demand and clinical reasoning depth**, not arbitrary labelling.

| Level | Code | Criteria |
|---|---|---|
| Easy | `easy` | Tests direct recall of a widely-known, high-yield fact. A well-prepared NEET-PG candidate should answer correctly without reasoning through distractors. |
| Medium | `medium` | Requires understanding of a concept or a limited clinical reasoning step. Distractors are plausible. Requires active discrimination between options. |
| Hard | `hard` | Requires multi-step reasoning, integration of 2+ concepts, or knowledge of a known exception, rare mechanism, or advanced clinical decision. |

### Database Mapping
The existing `questions.difficulty` column accepts: `easy`, `medium`, `hard`. No schema change required.

### Anti-patterns to avoid
- Do NOT label a question `hard` simply because the content is rarely taught.
- Do NOT label a clinical vignette `hard` simply because it is long. Length does not equal difficulty.

---

## 6. Distractor Standard

Distractors are the incorrect options. They are the primary determinant of question quality.

### Required
- Every distractor must be **medically relevant** — a plausible diagnosis, drug, mechanism, or value that a student who does not know the discriminating concept might choose.
- Every distractor must be **clearly incorrect** when the correct discriminating concept is applied.
- No distractor may be trivially implausible.
- No distractor may accidentally contain a clue pointing toward the correct answer.
- No two distractors may be near-duplicates of each other.
- For pharmacology questions, distractors should be real drugs in the same class or nearby clinical decision space.
- For diagnosis questions, distractors should represent the realistic differential.

### Why-Wrong Rationale (`why_wrong`)
- Recommended for every distractor.
- Must explain specifically why the option is incorrect, not simply state it is wrong.
- Example: "Metformin does not cause hypoglycaemia as a primary side effect; it reduces hepatic glucose output without stimulating insulin secretion."

---

## 7. Explanation Standard

The explanation (`explanation`) is shown after the student submits an answer.

### Required structure
1. **Core concept** — State the key principle the question is testing.
2. **Why correct** — Explain why the correct option is the single best answer.
3. **Why wrong (top 1–2 distractors)** — Briefly explain the most commonly confused distractors.
4. **Discriminating feature** — The fact or reasoning step that separates the correct answer from the best distractor.
5. **Exam relevance** — One sentence on why this is tested in PG entrance exams.

### Length
Target: **150–400 words**. The explanation should reinforce the concept, not replace a textbook.

### Key Learning Point (`key_learning_point`)
A single sentence (25 words or fewer) capturing the high-yield takeaway. Suitable for flashcard-style review.

Example: "Wernicke's encephalopathy is caused by Thiamine (B1) deficiency and presents with the triad of confusion, ophthalmoplegia, and ataxia."

---

## 8. Curriculum Mapping Rules

Every production question must carry a valid curriculum mapping.

| Field | Rule |
|---|---|
| `subject_id` | Must reference a valid row in `subjects` |
| `topic_id` | Must reference a valid row in `topics` |
| `topic.subject_id` | Must equal `question.subject_id` — enforced by the importer |

### Validation
The import script (`scripts/import-questions.ts`) enforces all three rules at import time. Any mismatch results in a validation error and import rejection. This is a hard constraint.

### Subtopic
Where canonical subtopics exist in the `subtopics` table, assigning `subtopic_id` is recommended but not required for initial ingestion.

---

## 9. Exam Relevance Rubric

`exam_relevance` is an integer `1–10` assigned by the question author.

| Score | Meaning |
|---|---|
| 9–10 | Repeatedly tested in NEET-PG / INICET / FMGE. Core high-yield. Every student must know this. |
| 7–8 | Commonly tested. Important concept. Expect at least 1–2 questions per exam cycle. |
| 5–6 | Moderate importance. Tested occasionally. Worth knowing, not a top priority. |
| 3–4 | Rarely tested. Niche or tangential. Useful for thorough preparation only. |
| 1–2 | Very rarely tested. Academic interest only. Not recommended for frontline inclusion. |

### Default
If not explicitly assigned, the import script uses `exam_relevance = 5`. Authors must consciously raise this for high-yield content.

---

## 10. Provenance Requirements

| Code | Meaning | Required Evidence |
|---|---|---|
| `ORIGINAL` | Question authored entirely by ANDE MED or contracted educators | Author name, date of creation, institution affiliation if applicable |
| `LICENSED` | Question legally licensed from a third party | Signed license agreement, licensor name, license scope, expiry date |
| `OTHER_AUTHORIZED` | Authorized for use via explicit written permission | Written authorization document, grantor name, scope of use, date |

### Prohibited
- Questions copied from commercial QBanks (Marrow, PrepLadder, BTR, DBMCI, Dr. Bhatia, DAMS, etc.) without a signed license agreement.
- Questions copied from published textbooks or question banks without explicit rights clearance.
- Questions paraphrased from copyrighted content where the rephrasing does not constitute an independently created work.

> **Audit trail:** Every question with provenance `LICENSED` or `OTHER_AUTHORIZED` must have a corresponding file reference in `docs/licensing/` documenting the authorization.

---

## 11. Duplicate and Near-Duplicate Policy

### Exact Duplicate (Hard Rule)
- `import_id` is the primary deduplication key.
- The database enforces `UNIQUE(import_id)` at the schema level.
- Attempting to import a question with an existing `import_id` will be rejected by the importer unless the version is incremented.

### Version Upgrade
- If a question is materially corrected (stem clarified, distractor improved, explanation updated), increment `version` and supply the same `import_id`.
- The importer rejects lower-or-equal versions, preventing accidental regression.

### Near-Duplicate (Advisory)
- The system does not currently enforce fuzzy similarity matching. This is intentional.
- Authors are responsible for not submitting semantically equivalent questions covering the same discriminating fact.
- A future similarity-detection advisory (non-blocking) may be added as a post-ingestion QA step.

---

## 12. Content Review Checklist (REVIEW to APPROVED)

A reviewer must confirm all items below before promoting a question from `REVIEW` to `APPROVED`.

```
[ ] Stem is unambiguous and tests a single concept
[ ] Stem is clinically/factually accurate
[ ] Exactly one correct option (SBA)
[ ] All options are grammatically parallel
[ ] No option length imbalance that clues the correct answer
[ ] All distractors are medically plausible and clearly incorrect
[ ] No accidental clues in distractors
[ ] Explanation covers: core concept, why correct, why wrong (top distractors), discriminating feature
[ ] Key learning point is accurate and concise (25 words or fewer)
[ ] Curriculum mapping is valid (subject -> topic)
[ ] Difficulty is correctly assigned per the rubric
[ ] exam_relevance is correctly assigned per the rubric
[ ] Provenance is documented
[ ] Language is clear, free of grammatical errors
[ ] No copyrighted material reproduced without authorization
[ ] why_wrong provided for at least top 2 distractors
```

Questions that fail this checklist are returned to `DRAFT` with reviewer notes.

---

## 13. Pilot Dataset Recommendation

### Target Size
**50–75 ORIGINAL questions** across **5–7 canonical subjects**.

This is large enough to:
- Exercise multiple question types per subject
- Test the adaptive engine with real data
- Generate meaningful mastery and recommendation signals
- Allow manual quality review without overwhelming a small team

This is small enough to:
- Complete in a controlled authoring sprint
- Review every question before promotion to `PUBLISHED`
- Catch systematic authoring errors early

### Recommended Subject Coverage
Select subjects from the 19 canonical subjects with highest NEET-PG question frequency:
1. Anatomy
2. Physiology
3. Biochemistry
4. Pathology
5. Pharmacology
6. Medicine
7. Surgery

### Question Type Distribution (per subject)
| Type | Target proportion |
|---|---|
| `VIGNETTE` | 30–40% |
| `FACTUAL` | 25–30% |
| `MECHANISM` | 15–20% |
| `PHARMA` or `PATHOLOGY` | 10–15% |
| `INVESTIGATION` | 10% |
| `INTEGRATED` | 5–10% |

### Difficulty Distribution (per subject)
| Level | Target proportion |
|---|---|
| `easy` | 25–30% |
| `medium` | 50–55% |
| `hard` | 15–25% |

---

## 14. Quality Acceptance Metrics for Pilot

| Metric | Acceptance Threshold |
|---|---|
| Valid imports (pass importer validation) | 98% or higher |
| Complete metadata (all required fields present) | 100% |
| Correctly mapped questions (subject + topic valid) | 100% |
| Duplicate rate (same `import_id`) | 0% |
| Reviewer rejection rate (returned to DRAFT) | Below 10% |
| Ambiguity rate (flagged by reviewer as ambiguous SBA) | Below 5% |
| Explanation completeness (all required sections present) | 95% or higher |
| Answer-key integrity (exactly one correct option) | 100% |
| `easy` proportion | 20–35% |
| `medium` proportion | 45–60% |
| `hard` proportion | 10–30% |
| Subject coverage | 5 or more canonical subjects |

Any metric below threshold triggers a review sprint before the pilot is promoted.

---

## 15. Schema Impact Assessment

| Field | Status |
|---|---|
| `questions.import_id` | Present — added in M13.3 |
| `questions.provenance` | Present |
| `questions.status` | Present — DRAFT / REVIEW / APPROVED / PUBLISHED / RETIRED |
| `questions.difficulty` | Present — easy / medium / hard |
| `questions.exam_relevance` | Present |
| `questions.clinical_classification` | Present |
| `questions.version` | Present |
| `questions.explanation` | Present |
| `questions.key_learning_point` | Present |
| `question_options.why_wrong` | Present |
| `question_options.is_correct` | Present — protected by RLS |

**No schema changes required for M13.5.** The existing schema fully supports the quality standard defined above.

---

## 16. Adaptive Engine Compatibility

| Engine | Impact |
|---|---|
| `AdaptiveEngine` | No change — uses `difficulty`, `topic_id`, `status = PUBLISHED` |
| `QuestionRecommendationEngine` | No change — uses `exam_relevance`, weakness data |
| `CurriculumEngine` | No change — uses `subject_id`, `topic_id` |
| `PerformanceEngine` | No change — uses `question_attempts` |
| `RevisionEngine` | No change — uses `revision_items` |
| `DailyMissionEngine` | No change — uses `daily_missions`, `mission_items` |
| `ReadinessEngine` | No change — uses mastery scores |

No engine modification is required or permitted as a result of this milestone.
