-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  exam TEXT,
  exam_date DATE,
  target_rank INTEGER,
  daily_target INTEGER DEFAULT 25,
  current_prep_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  academic_year TEXT,
  display_order INTEGER,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  display_order INTEGER,
  exam_relevance INTEGER DEFAULT 5 CHECK (exam_relevance BETWEEN 1 AND 10),
  clinical_classification TEXT CHECK (clinical_classification IN ('clinical', 'preclinical', 'paraclinical', 'integrated')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- Subtopics
CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  display_order INTEGER,
  exam_relevance INTEGER DEFAULT 5 CHECK (exam_relevance BETWEEN 1 AND 10),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, name)
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id TEXT UNIQUE,
  exam TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  topic_id UUID REFERENCES topics(id),
  subtopic_id UUID REFERENCES subtopics(id),
  question_text TEXT NOT NULL CHECK (char_length(trim(question_text)) > 0),
  explanation TEXT,
  key_learning_point TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')), 
  question_type TEXT DEFAULT 'single_best_answer', 
  exam_relevance INTEGER DEFAULT 5 CHECK (exam_relevance BETWEEN 1 AND 10),
  clinical_classification TEXT CHECK (clinical_classification IN ('clinical', 'preclinical', 'paraclinical', 'integrated')),
  provenance TEXT DEFAULT 'ORIGINAL' CHECK (provenance IN ('ORIGINAL', 'LICENSED', 'OTHER_AUTHORIZED')),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED')),
  version INTEGER DEFAULT 1,
  source_type TEXT DEFAULT 'original',
  tags TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Options
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  why_wrong TEXT
);

-- Question Attempts
CREATE TABLE question_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES question_options(id),
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  confidence TEXT,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic Mastery
CREATE TABLE topic_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  mastery_score NUMERIC DEFAULT 50.0,
  weakness_score NUMERIC DEFAULT 50.0,
  questions_attempted INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  UNIQUE(user_id, topic_id)
);

-- Subject Mastery
CREATE TABLE subject_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  mastery_score NUMERIC DEFAULT 50.0,
  questions_attempted INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  UNIQUE(user_id, subject_id)
);

-- Revision Items
CREATE TABLE revision_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  reason TEXT,
  priority INTEGER DEFAULT 1,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Topic Progress (M13)
CREATE TABLE student_topic_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  manually_completed BOOLEAN DEFAULT FALSE,
  manually_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Daily Missions
CREATE TABLE daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_questions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_date)
);

-- Mission Items
CREATE TABLE mission_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES daily_missions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  item_type TEXT, -- weak_topic, revision, mixed, challenge
  status TEXT DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Explanations
CREATE TABLE ai_explanations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  concept TEXT,
  why_correct TEXT,
  why_user_was_wrong TEXT,
  why_other_options_are_wrong TEXT,
  exam_pearl TEXT,
  memory_hook TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Public read access for curriculum
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read subtopics" ON subtopics FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- User data policies
CREATE POLICY "User read own attempts" ON question_attempts FOR SELECT USING (auth.uid() = user_id);
-- Removed INSERT for question_attempts: mutations handled by secure backend API

CREATE POLICY "User read own topic mastery" ON topic_mastery FOR SELECT USING (auth.uid() = user_id);
-- Removed ALL for topic_mastery: mutations handled by secure backend API

CREATE POLICY "User read own subject mastery" ON subject_mastery FOR SELECT USING (auth.uid() = user_id);
-- Removed ALL for subject_mastery: mutations handled by secure backend API

CREATE POLICY "User read own revision" ON revision_items FOR SELECT USING (auth.uid() = user_id);
-- Removed INSERT/UPDATE for revision_items: mutations handled by secure backend API

CREATE POLICY "User read own topic progress" ON student_topic_progress FOR SELECT USING (auth.uid() = user_id);
-- User can insert/update their own topic progress (if allowed from client) or we can restrict it to server. The instructions say "never accept arbitrary user_id ... avoid service-role exposure... Student-owned completion/progress records must use proper RLS". Let's allow insert/update from client with check on user_id, OR do it via API.
-- Actually the API POST /api/curriculum/topic-progress is better for tracking updates, so we'll just allow SELECT.
-- No INSERT/UPDATE policy here, we'll use API.

CREATE POLICY "User read own missions" ON daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User read own mission items" ON mission_items FOR SELECT USING (EXISTS (
  SELECT 1 FROM daily_missions dm WHERE dm.id = mission_items.mission_id AND dm.user_id = auth.uid()
));

CREATE POLICY "User read own AI explanations" ON ai_explanations FOR SELECT USING (auth.uid() = user_id);
-- Removed INSERT for ai_explanations: handled by backend

-- Performance Indexes
CREATE INDEX idx_attempts_user_question_created ON question_attempts(user_id, question_id, created_at DESC);
CREATE INDEX idx_mastery_user ON topic_mastery(user_id);
CREATE INDEX idx_revision_user_date ON revision_items(user_id, scheduled_date);

-- Trigger to validate exactly one correct option (deferred to end of transaction usually, but we will enforce in application logic too. Here we add a function to check it).
CREATE OR REPLACE FUNCTION check_single_best_answer()
RETURNS TRIGGER AS $$
BEGIN
  -- We only enforce this when a question's status becomes PUBLISHED.
  IF (SELECT status FROM questions WHERE id = NEW.question_id) = 'PUBLISHED' THEN
    IF (SELECT count(*) FROM question_options WHERE question_id = NEW.question_id AND is_correct = true) != 1 THEN
      RAISE EXCEPTION 'A PUBLISHED single_best_answer question must have exactly one correct option';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to options
CREATE TRIGGER validate_sba_options
AFTER INSERT OR UPDATE ON question_options
FOR EACH ROW EXECUTE FUNCTION check_single_best_answer();

-- Apply to questions when status changes to PUBLISHED
CREATE OR REPLACE FUNCTION check_question_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND NEW.question_type = 'single_best_answer' THEN
    IF (SELECT count(*) FROM question_options WHERE question_id = NEW.id) < 2 THEN
      RAISE EXCEPTION 'A PUBLISHED question must have at least 2 options';
    END IF;
    IF (SELECT count(*) FROM question_options WHERE question_id = NEW.id AND is_correct = true) != 1 THEN
      RAISE EXCEPTION 'A PUBLISHED single_best_answer question must have exactly one correct option';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_question_publish
AFTER UPDATE OF status ON questions
FOR EACH ROW EXECUTE FUNCTION check_question_publish();

-- M12: Integrated Learning Graph

CREATE TABLE integrated_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  exam_relevance INTEGER DEFAULT 5 CHECK (exam_relevance BETWEEN 1 AND 10),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'RETIRED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integrated_concept_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integrated_concept_id UUID REFERENCES integrated_concepts(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'RELATED' CHECK (relationship_type IN ('CORE', 'RELATED', 'CLINICAL_APPLICATION', 'FOUNDATION', 'COMPLICATION', 'DIAGNOSIS', 'TREATMENT')),
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integrated_concept_id, subject_id, topic_id, subtopic_id)
);

ALTER TABLE integrated_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrated_concept_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read integrated_concepts" ON integrated_concepts FOR SELECT USING (true);
CREATE POLICY "Public read integrated_concept_links" ON integrated_concept_links FOR SELECT USING (true);

-- Student Topic Sessions (M15)
CREATE TABLE student_topic_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_topic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User read own topic sessions" ON student_topic_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_student_topic_sessions_user_topic_start ON student_topic_sessions(user_id, topic_id, started_at);
CREATE INDEX idx_student_topic_sessions_user_topic_status ON student_topic_sessions(user_id, topic_id, status);

-- M17: Topic Spaced Repetition (Topic Revisions)
CREATE TABLE student_topic_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    scheduled_for DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'OVERDUE')),
    interval_days INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_topic_revisions_user_scheduled ON student_topic_revisions(user_id, scheduled_for);
CREATE INDEX idx_student_topic_revisions_user_topic ON student_topic_revisions(user_id, topic_id);
CREATE INDEX idx_student_topic_revisions_user_status_scheduled ON student_topic_revisions(user_id, status, scheduled_for);

ALTER TABLE student_topic_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topic revisions"
    ON student_topic_revisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage topic revisions"
    ON student_topic_revisions FOR ALL
    USING (auth.role() = 'service_role');
