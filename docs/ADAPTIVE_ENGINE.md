# Adaptive Engine v2

The core engine is a **deterministic**, non-LLM based system that orchestrates question selection and performance decay.

## 1. Mastery Score (0-100)
- Increases upon correct answers. The delta is scaled by confidence (high = 120%, low = 50%) and difficulty.
- Bounded strictly between 0 and 100 with diminishing returns to prevent rapid artificial inflation.
- Safely protected from catastrophic drops if a high-mastery user answers a single difficult question incorrectly.

## 2. Weakness & Priority
- **Weakness** = (100 - Mastery)*0.4 + ForgettingRisk*0.2 + RepeatedErrors*0.2
- **Question Priority** determines selection:
  - Overdue revisions forcibly bump priority +200.
  - Recent exposure (within 1 day) penalizes priority heavily (-1000) to ensure topic diversity.
  - Exam relevance operates as a fixed multiplier.

## 3. Revision Engine (Spaced Repetition)
- Any incorrect answer forces a **1-day reset**.
- Consecutive correct streaks scale the interval: `2 days (low conf) -> 3 days -> 7 days -> 14 days -> 21 days`.
- **Note**: Streaks are strictly calculated at the **question-level**. Repeatedly getting a specific question correct pushes its individual revision date further out.


## 4. Readiness Score
- A proprietary internal progress indicator, *NOT* a success probability.
- Formula: `(Avg Mastery * 0.7) + (Practice Volume Factor * 0.3)`.
