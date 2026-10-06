# Testing Strategy

## 1. Unit Tests (Jest)
- Executes fully isolated logic testing for the `AdaptiveEngine` and `DashboardEngine` pure functions.
- Validates nuanced edge cases (boundary limits, revision resets, tie-breaking, baseline configurations).
- Ensure types match `AttemptResult` payload closely.

## 2. Integration Tests
- Hosted in `src/app/api/__tests__/integration.test.ts`.
- Validates the end-to-end loop: simulating an initial New User baseline, logging attempts, calculating subsequent priority shifts, and determining the Dashboard's next action.

## 3. Execution
- `npx tsc --noEmit` verifies strict structural typings.
- `npx jest` verifies the algorithms dynamically.
