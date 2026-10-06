# Readiness Engine

## 1. Purpose
The Readiness Score is a deterministic, internal learning-progress metric bounded between 0 and 100.

**CRITICAL PRODUCT RULE:**
The Readiness Score is strictly an internal metric of curriculum completion and demonstrated mastery. It must **NEVER** be described in the UI, marketing, or documentation as:
- A probability of passing INI-CET or NEET-PG
- A predicted rank
- A guarantee of exam success

## 2. Inputs
The engine consumes:
1. `globalMasteryAverage`: Mean of all subject mastery scores (0-100).
2. `overallAccuracy`: All-time correctness ratio (0-1).
3. `recentAccuracy`: 7-day correctness ratio (0-1).
4. `questionsAttempted`: Absolute volume of practice.
5. `criticalWeaknessesCount`: Number of topics classified as CRITICAL_WEAKNESS.
6. `overdueRevisionCount`: Number of pending revisions from spaced repetition.

## 3. Formula
- **Baseline Requirement**: If `< 20` questions attempted, score is capped at `30` (min of `30` or `mastery`).
- **Mastery Component**: `globalMasteryAverage * 0.40` (Max 40 points)
- **Accuracy Component**: `(overallAccuracy * 100 * 0.15) + (recentAccuracy * 100 * 0.15)` (Max 30 points)
- **Volume Component**: `min(10, (questionsAttempted / 500) * 10)` (Max 10 points)

Base Score = Mastery + Accuracy + Volume

**Penalties**:
- Weakness: `-2` points per critical weakness.
- Revisions: `-0.5` points per overdue revision (capped at `-10` points).

**Final Output**: Bound between 0 and 100.

## 4. Classifications
- **CRITICAL_WEAKNESS**: >= 10 attempts AND (mastery < 30 OR accuracy < 40%)
- **EMERGING_WEAKNESS**: < 10 attempts AND (mastery < 30 OR accuracy < 40%)
- **STRONG_AREA**: > 80 mastery AND >= 75% accuracy
- **KNOWLEDGE_GAP**: < 5 attempts
- **NORMAL**: Otherwise

## 5. Limitations
- Readiness does not measure exam-day psychological resilience.
- Over-practicing a single easy topic can artificially inflate the score if not balanced by curriculum completion.
