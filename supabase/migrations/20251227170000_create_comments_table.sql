-- Migration: Create comments table
-- Task 1.2: Create comments table with foreign key to tasks

-- Drop table if exists (for development)
DROP TABLE IF EXISTS public.comments CASCADE;

-- Create comments table
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT comments_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view comments on their tasks" ON public.comments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments on their tasks" ON public.comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON public.comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_updated_at(); 