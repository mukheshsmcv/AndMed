# ANDE MED Architecture

## Overview
ANDE MED is built exclusively for mobile execution via React Native / Expo, backed by Supabase (PostgreSQL + Auth).

## Client Layer (Frontend)
- **Framework**: Expo / Expo Router
- **Styling**: NativeWind v4 (Tailwind CSS)
- **State**: React hooks + Expo Router parameter passing.
- **Role**: Strictly presentational. It fetches data and submits answers but does NOT evaluate correctness.

## API Layer
- **Environment**: Expo API Routes (`src/app/api/...`)
- **Isolation**: Runs securely on the backend (e.g. Vercel or EAS Hosting). It utilizes the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS securely.
- **Endpoints**:
  - `GET /api/next-question`: Aggregates candidates and runs the deterministic AdaptiveEngine.
  - `POST /api/submit-attempt`: Validates correctness server-side, updates mastery/streaks, and schedules revisions.
  - `GET /api/dashboard`: Aggregates mastery and determines the next action mission.

## Data Layer (Supabase)
- **PostgreSQL**: Stores questions, attempts, and mastery.
- **RLS**: Row-Level Security explicitly denies client-side mutations for user data (like attempts and mastery), forcing all writes through the API Layer.

## Core Concepts
The system separates student progress into five distinct concepts:

1. **Study Session** (`student_topic_sessions`): A continuous period of time spent actively studying a topic.
2. **Topic Completion** (`student_topic_progress`): The explicit, manual declaration by the user that a topic has been fully studied and completed.
3. **Topic Revision** (`student_topic_revisions`): Deterministic, spaced repetition scheduling to review entire topics that were previously completed.
4. **Question Revision** (`revision_items`): MCQ-specific spaced repetition for individual questions that the user answered incorrectly.
5. **Mastery** (`topic_mastery`): An algorithmic score (0-100) reflecting demonstrated knowledge derived entirely from objective MCQ performance, uninfluenced by study time or manual completions.
