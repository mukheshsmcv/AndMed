# Curriculum Architecture (M12)

## 1. Hierarchy
The ANDE MED curriculum uses a strict, deterministic hierarchy:
`Subject → Topic → Subtopic`

This structure prevents duplicate naming and ensures all learning objects belong to a clear domain.

## 2. Integrated Learning Graph
To represent complex clinical concepts that span multiple domains (e.g., Diabetes Mellitus), the system uses an **Integrated Learning Graph**.

- **Integrated Concept**: A top-level concept (e.g., Diabetes).
- **Integrated Concept Link**: A relationship connecting the concept to specific `topic_id` or `subtopic_id` within a `subject_id`. It carries a `relationship_type` (e.g., CORE, DIAGNOSIS, COMPLICATION) and an `importance` weight.

## 3. Student Progress Model
Curriculum completion is NOT a boolean flag. It is derived deterministically at runtime from `topic_mastery` and `revision_items`.

**Statuses:**
- `NOT_STARTED`: 0 questions attempted.
- `IN_PROGRESS`: < 5 questions attempted.
- `STUDIED`: >= 5 questions, but mastery < 75.
- `MASTERED`: >= 15 questions and mastery >= 75.
- `NEEDS_REVISION`: Derived purely from `revision_items` when a topic has an overdue revision. Overrides all other statuses.

## 4. Completion Formula
Completion Percentage = `masteryScore * min(1.0, questionsAttempted / 20)`.
This prevents a 100% mastery score achieved on 1 lucky question from falsely marking a topic as 100% complete.

## 5. Integrated Mastery Formula
The mastery of an integrated concept is the **weighted average** of its connected topics.
`sum(componentMastery * componentImportance) / sum(componentImportance)`

- If a component has 0 attempts, its mastery is 0, which pulls down the average.
- If total attempts across all components < 10, it returns `INSUFFICIENT_DATA`.

## 6. Integration with M9, M10, M11
- **M9 (Daily Mission)**: M9 remains the source of truth for generating mission actions. It can optionally use integrated topics as weak areas if needed, but it currently relies on the pure topic weakness model.
- **M10 (Performance)**: M10 handles the statistical classification of topics. M12 simply maps them visually into the curriculum tree.
- **M11 (Recommendation)**: M11 performs all question selection. When a user taps "Practice Topic" from the M12 Curriculum view, M11 handles the actual question delivery under the hood by receiving the targeted `topic_id`.

## 7. Performance & Query Strategy
To avoid OOM and N+1 issues when rendering the entire curriculum:
- The `/api/curriculum` endpoint does NOT query `question_attempts`.
- It relies entirely on `topic_mastery` (which stores pre-aggregated `questions_attempted` and `mastery_score`).
- It fetches overdue `revision_items` as a single flat list.
- All tree building and status derivations happen in-memory on the server in `O(N)` time.

## 8. Data Quality Rules
- No duplicate Canonical Slugs for Integrated Concepts.
- A single question cannot have multiple correct answers (enforced via DB Trigger).
- Only `PUBLISHED` questions are surfaced.
