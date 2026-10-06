CREATE TABLE IF NOT EXISTS public.student_daily_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    target_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, local_date)
);

ALTER TABLE public.student_daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily goals"
    ON public.student_daily_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily goals"
    ON public.student_daily_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily goals"
    ON public.student_daily_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
