# ANDE MED Architecture

## Overview
ANDE MED is built exclusively for mobile execution via React Native / Expo, backed by Supabase (PostgreSQL + Auth).

## Client Layer (Frontend)
- **Framework**: Expo / Expo Router
- **Styling**: NativeWind v4 (Tailwind CSS) + DesignSystem tokens
- **State**: React hooks + Expo Router parameter passing + `useFocusEffect` live screen refresh.
- **Role**: Strictly presentational and study tracking. It coordinates user sessions, timers, and reviews.

## API Layer
- **Environment**: Expo API Routes (`src/app/api/...`)
- **Isolation**: Runs securely on the backend. It utilizes the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS securely and derive user identity from authenticated Supabase JWT tokens.
- **Key Endpoints**:
  - `GET /api/dashboard`: Aggregates active revisions, recent subjects, dual-metric subject progress, today study seconds, streak, and target focus.
  - `GET /api/curriculum`: Returns the full MBBS canonical curriculum tree with dual-metric subject progress (Topics Completed & MCQ Accuracy).
  - `GET /api/revisions`: Returns topic spaced revisions categorized into Overdue, Due Today, and Upcoming tiers, plus question revision counts.
  - `POST /api/curriculum/topic-progress`: Records explicit manual topic completion and triggers M17 topic spaced repetition scheduling.

## Data Layer (Supabase)
- **PostgreSQL**: Stores subjects, topics, questions, attempts, sessions, progress, and topic revisions.
- **RLS**: Row-Level Security explicitly enforces user data isolation across all tables.

## Core Concepts & Distinction
The system maintains absolute separation across five fundamental learning concepts:

1. **Study Session** (`student_topic_sessions`): A continuous period of time spent actively studying a topic (with duration and started_at timestamps).
2. **Topic Completion** (`student_topic_progress`): The explicit declaration by the user that a topic has been completed.
3. **Topic Revision** (`student_topic_revisions`): Deterministic spaced repetition scheduling ($7 \rightarrow 14 \rightarrow 30 \rightarrow 60 \rightarrow 90$ days) to revisit previously completed topics.
4. **Question Revision** (`revision_items`): MCQ-specific adaptive repetition for individual questions that were answered incorrectly.
5. **Mastery** (`topic_mastery`): An algorithmic score (0–100) reflecting demonstrated knowledge derived entirely from objective MCQ performance, uninfluenced by study time or manual completions.

## Semantic Rules & Data Flows

### 1. Curriculum Dual Progress
Every subject card displays two independent, non-merged metrics:
- **Topics Completed**:
  - Numerator: Topics belonging to the subject with `student_topic_progress.status = 'COMPLETED'`.
  - Denominator: Total active canonical topics for that subject.
  - Bar: $\frac{\text{Completed}}{\text{Total}} \times 100\%$.
- **MCQ Accuracy**:
  - Derived from actual `question_attempts` scoped to questions belonging to that subject.
  - Accuracy = $\frac{\text{Correct Attempts}}{\text{Total Attempts}} \times 100\%$.
  - If 0 attempts exist: Renders an honest empty state (`"— No MCQs attempted"`), NOT `0%`.

### 2. Recent Subjects on Home
- Derived exclusively from legitimate completed study sessions in `student_topic_sessions` ($\ge 60$ seconds).
- Resolves session `topic_id` $\rightarrow$ `subject_id`.
- Groups by distinct subject and orders by the latest session's `started_at` descending.
- Formats relative time (e.g., *"Studied today"*, *"Studied yesterday"*, *"3 days ago"*).
- If no study sessions exist: Shows a clean prompt to explore the curriculum.

### 3. Daily Study Target Semantics
- Authoritative setting: `daily_study_target_hours` stored in `user_metadata`.
- Represents the user's aspirational target (e.g. 6h, 8h, 10h), strictly distinct from actual measured study time.
- Changes in Profile immediately persist and reflect on Home upon focus (`useFocusEffect`), without requiring app restart.
- Does not modify adaptive mastery, question selection, or spaced repetition intervals.

### 4. Revision Tab & Spaced Repetition
- Central hub for **Topic Spaced Repetition** (`student_topic_revisions`).
- Categorizes revisions into:
  - **Overdue**: Revisions where `scheduled_for < today` and `status IN ('SCHEDULED', 'OVERDUE')`.
  - **Due Today**: Revisions where `scheduled_for = today` and `status = 'SCHEDULED'`.
  - **Upcoming**: Revisions where `scheduled_for > today` and `status = 'SCHEDULED'`.
- Tapping **[Start Revision]** opens the topic's detail page. Opening does NOT auto-complete the revision.
- Completing a revision marks the current revision `COMPLETED` and automatically schedules the next interval using the $7 \rightarrow 14 \rightarrow 30 \rightarrow 60 \rightarrow 90$-day policy.
