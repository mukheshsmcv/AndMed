# ANDE MED Question Ingestion Pipeline

## Canonical JSON Format
The importer requires a strict JSON array format. Below is the canonical representation of a question:
```json
[
  {
    "importId": "Q-UNIQUE-12345",
    "exam": "NEET-PG",
    "subjectSlug": "anatomy",
    "topicSlug": "anatomy-general-anatomy",
    "stem": "Which of the following is true?",
    "options": [
      { "text": "Option A", "isCorrect": true, "whyWrong": null },
      { "text": "Option B", "isCorrect": false, "whyWrong": "Explanation of why B is wrong" }
    ],
    "explanation": "Detailed explanation of the answer...",
    "keyLearningPoint": "High-yield summary...",
    "difficulty": "medium",
    "examRelevance": 7,
    "clinicalClassification": "clinical",
    "provenance": "ORIGINAL",
    "version": 1
  }
]
```

## Validation Rules
The ingestion script (`scripts/import-questions.ts`) enforces the following validation checks to ensure data integrity:
1. **Format**: The file must be a valid JSON array.
2. **Missing Fields**: Rejects missing `importId`, `stem`, or `exam`.
3. **Options Constraints**: 
   - Rejects fewer than 2 options.
   - Rejects blank option texts.
   - Requires *exactly one* option with `isCorrect: true`.
4. **Curriculum Alignment**:
   - `subjectSlug` must exist in the live database.
   - `topicSlug` must exist in the live database.
   - `topicSlug` must correctly map as a child to the provided `subjectSlug`.
5. **Duplicate Protection**:
   - Ensures `importId` is unique. 
   - Checks the live database for collisions on `importId`. By default, prevents overwrites.

## Provenance Enforcement
To ensure compliance with copyright laws, the `provenance` field is restricted strictly to:
- `ORIGINAL` (Content created in-house or by contracted educators)
- `LICENSED` (Content legally licensed from third-party sources)
- `OTHER_AUTHORIZED` (Other authorized content)

Any other value (e.g., scraping commercial q-banks without explicit licensing) will throw a validation error and abort ingestion.

## Lifecycle Management
All imported questions default their status to **`DRAFT`**. 
The system adheres to a strict state machine:
`DRAFT` → `REVIEW` → `APPROVED` → `PUBLISHED` → `RETIRED`

- Only questions in the `PUBLISHED` state are surfaced to users (via `/api/next-question`, Daily Missions, or the Adaptive Engine).
- Admin workflows are required to transition a question's status safely.

## Versioning & Integrity
If an existing question needs an update, its version is incremented. Modifying `questions` or `question_options` safely preserves analytics data, meaning historical `question_attempts` continue pointing to the correct root question. Historical attempt metrics are not invalidated by content corrections unless a question is entirely replaced with a new `importId`. 

## Dry-Run Usage
To validate a JSON payload without inserting into the database:
```bash
npx tsx scripts/import-questions.ts --file sample.json --dry-run
```
This mode:
- Connects to the live Supabase database.
- Validates all rules (including curriculum presence and duplication checks).
- Outputs a detailed report of `valid` vs `invalid` entries.
- Exits safely without committing any data.

## Import Process & Security Model
To run the live import:
```bash
npx tsx scripts/import-questions.ts --file sample.json
```
**Security:**
- The script utilizes the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS securely from an authenticated backend/script context. 
- It never exposes the service role to clients.
- `question_options` remains tightly locked via RLS (no public SELECT), preventing unauthorized students from fetching `is_correct` answers with their Anon key. 
- By defaulting to `DRAFT`, imported items require explicit manual or automated review before becoming visible in the application.
