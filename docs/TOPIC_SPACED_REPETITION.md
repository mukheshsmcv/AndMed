# M17 - Topic Spaced Repetition

## Purpose
The topic spaced repetition system creates deterministic review schedules for topics that have been studied and manually marked complete. This enables an optimal learning loop: Plan -> Study -> Complete -> Schedule Revision -> Review -> Study Again -> Complete -> Next Revision.

## Distinction from Question Revision
**Topic Revision** focuses exclusively on scheduling when the student should review an entire topic based on their manual completions.
**Question Revision** (`revision_items`) continues to operate independently to schedule individual MCQs based on prior incorrect attempts using the M6 adaptive engine. The two systems serve different layers of the curriculum.

## Initial Spacing Policy
The initial spaced repetition schedule follows a deterministic progression when a topic is marked `COMPLETED` by the user:
- First completed study: 7 days
- Second completed revision: 14 days
- Third: 30 days
- Fourth: 60 days
- Fifth and later: 90 days

## Eligibility
Only legitimate study completions will generate a revision schedule. This occurs exclusively when a user uses the "Mark Complete" action on the topic screen. Simply opening a topic, attempting MCQs, or starting a session does not trigger topic revision scheduling.

## Statuses
- **SCHEDULED**: The revision is upcoming.
- **COMPLETED**: The user has successfully performed and completed the scheduled revision.
- **SKIPPED**: The user explicitly skipped this revision (optional future feature).
- **OVERDUE**: The current date is past the `scheduled_for` date and it is not yet completed.

## Overdue Behavior
If `scheduled_for` < today, the status is inherently treated as `OVERDUE`. The dashboard will prioritize showing overdue topics. The system does not create duplicate overdue rows; a single revision remains overdue until it is completed or rescheduled.

## Duplicate Protection
A user can only have at most one active (`SCHEDULED` or `OVERDUE`) revision per topic at any given time. If an active revision already exists when a user completes a topic outside the normal flow, the system can recalculate its interval but will not create duplicate scheduling rows.

## Completion Behavior
When an active revision is completed:
1. The existing record is updated to `COMPLETED` and `completed_at` is recorded.
2. A new revision record is created based on the next interval defined in the spacing policy.
The topic's overall completion status remains complete, decoupled from the revision schedule.

## Future Expansion Possibilities
- Intelligent scheduling driven by MCQ accuracy data to override the deterministic schedule.
- Exam pressure compression: Automatically tightening intervals as the target exam date approaches.
