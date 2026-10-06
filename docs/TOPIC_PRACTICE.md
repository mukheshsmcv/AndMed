# Topic-Based Practice Engine (M13)

## 1. Objective
Enable the student to practice questions constrained to a specific Topic, Subject, or Academic Year, without bypassing the existing M11 Adaptive Recommendation Engine.

## 2. Modes
The `/api/next-question` endpoint accepts a `mode`, `topicId`, and `subjectId` query parameter.
Supported modes:
- `TOPIC`: Constrains to `topicId`.
- `SUBJECT`: Constrains to `subjectId`.
- `WEAK_AREA`: Filters candidates where topic classification is `CRITICAL_WEAKNESS` or `EMERGING_WEAKNESS`.
- `INCORRECT`: Filters out candidates that were answered correctly or never attempted. Overrides the 1-day repetition lock.
- `REVISION`: Filters candidates strictly to overdue revisions.
- `UNATTEMPTED`: Filters out candidates that have any attempt history.

## 3. Integration with M11
M13 does NOT implement its own question selection logic. It simply constrains the candidate pool fed into M11 (`QuestionRecommendationEngine.ts`), and applies mode-specific hard filters (e.g., blocking attempted questions in `UNATTEMPTED` mode).

M11 still prioritizes questions based on:
- Exam Relevance
- Weakness Targeting
- Mastery-Aware Difficulty
- Repetition Penalties

## 4. Multi-Topic Practice
The `topicId` parameter supports a comma-separated list of IDs.
This powers "Practice Selected Topics" or Integrated Concept practice.

## 5. Security & Flow
- The student selects a topic and mode.
- The UI fetches `/api/next-question?topicId=X&mode=Y`.
- The user submits their answer via `/api/submit-attempt`.
- The backend independently updates `question_attempts`, `topic_mastery`, and `revision_items` via M6/M10 logic.
- The UI can refresh progress via `/api/curriculum` or `/api/performance`.

## 6. Manual Completion vs Mastery
If a student marks a topic as `COMPLETED` via `/api/curriculum/topic-progress`, this only updates `student_topic_progress`. It sets `completion = 100%` visually.
It does NOT inject fake attempts, fake mastery, or fake revision scores. Mastery remains distinct from Study Completion.
