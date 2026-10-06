# Security

## 1. Secrets Management
- The `SUPABASE_SERVICE_ROLE_KEY` is utilized strictly within backend processes (`src/lib/supabase-server.ts`).
- It must NEVER be prefixed with `EXPO_PUBLIC_`.
- `.env` and `.env*` files are strictly excluded via `.gitignore`.

## 2. Row-Level Security (RLS)
- Supabase enforces RLS ensuring the public frontend (via the Anon key) cannot mutate the `question_attempts` or `topic_mastery` tables.
- All mutating writes happen exclusively through the Expo API Routes, bypassing RLS using the service role key securely.

## 3. Answer Correctness Validation
- The frontend client only submits the `selectedOptionId`.
- The `is_correct` determination is evaluated server-side. The client cannot spoof their mastery by injecting `isCorrect: true`.

## 4. User Isolation
- Requests authenticate via Bearer tokens. 
- API Routes parse the token via `supabaseServer.auth.getUser()`. The system guarantees that mutations apply only to the implicitly verified `user.id` and cannot be hijacked by passing malicious IDs in the payload.
