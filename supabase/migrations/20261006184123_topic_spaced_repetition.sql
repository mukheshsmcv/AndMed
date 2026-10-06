-- M17: Topic Spaced Repetition

CREATE TABLE student_topic_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    scheduled_for DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'OVERDUE')),
    interval_days INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_student_topic_revisions_user_scheduled ON student_topic_revisions(user_id, scheduled_for);
CREATE INDEX idx_student_topic_revisions_user_topic ON student_topic_revisions(user_id, topic_id);
CREATE INDEX idx_student_topic_revisions_user_status_scheduled ON student_topic_revisions(user_id, status, scheduled_for);

-- Enable RLS
ALTER TABLE student_topic_revisions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own topic revisions"
    ON student_topic_revisions FOR SELECT
    USING (auth.uid() = user_id);

-- System service role can do anything
CREATE POLICY "Service role can manage topic revisions"
    ON student_topic_revisions FOR ALL
    USING (auth.role() = 'service_role');