# Question Curriculum Mapping

## 1. Mapping Model
Every question in the ANDE MED platform maps deterministically to a topic in the canonical MBBS curriculum (M13.1). The relationship is strictly hierarchical: `Question → Topic → Subject`. We avoid fuzzy mapping and require explicit mapping or manual review.

## 2. Canonical Hierarchy
The hierarchy established in M13.1 consists of 19 subjects containing 416 distinct topics. All new questions must map to one of these 416 canonical topics. Subtopics are supported structurally but currently unpopulated.

## 3. Mapping Rules
- **Prefer existing explicit mapping**: If a question already contains a valid `topic_id`, preserve it.
- **Subject derivation**: If a schema maintains both subject and topic references, `question.subject_id` must match `topic.subject_id`.
- **No LLM auto-mapping**: Do not silently rewrite database topics using semantic similarity; use a deterministic review queue.
- **Do not generate fake questions**: Topic coverage metrics must reflect the genuine question bank.

## 4. Coverage Calculation
Topic coverage assesses the volume of published questions per canonical topic to indicate practice readiness.
- **NONE**: 0 questions (Practice Not Available)
- **LOW**: 1-4 questions
- **MODERATE**: 5-9 questions
- **ADEQUATE**: 10-19 questions
- **STRONG**: 20+ questions

## 5. Practice Filtering
Practice modes restrict the candidate question pool based on curriculum mapping *before* applying adaptive engine rules.
- **Topic Practice**: Restricts pool to `topic_id = X`
- **Subject Practice**: Restricts pool to `subject_id = Y`
- **Multi-Topic Practice**: Restricts pool using `IN (topicA, topicB)`

## 6. M11 Integration
Filtering by curriculum node restricts the candidate pool, but the M11 `QuestionRecommendationEngine` remains the sole authority for:
- Weakness targeting
- Difficulty scaling
- Exam relevance and SRS (Spaced Repetition System) mechanics
- Selection of the single optimal next question

## 7. Handling Unmapped Questions
Questions with `NULL` or invalid topics are excluded from the practice pool. They are output to a manual review queue (`unmapped-question-review.json`) for explicit curation by content administrators.

## 8. Versioning
Questions maintain version control. Remapping an existing question does not mutate historical attempts. Substantive content changes require creating a new version and retiring the old to preserve the integrity of user analytics and mastery metrics.

## 9. Security
Curriculum mapping adheres to existing M7 RLS rules. Topic and mapping structural metadata may be read publicly, but practice metrics and attempts remain strictly user-isolated. Answer keys are strictly protected from client-side execution.

## 10. Future Subtopic Mapping
When required, a `subtopic_id` will be introduced. Current mappings correctly set `subtopic_id = NULL` to avoid redundant data generation, retaining forwards compatibility.
