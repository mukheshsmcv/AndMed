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
