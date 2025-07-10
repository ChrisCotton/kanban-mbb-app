-- Migration: Fix missing user_id columns in existing tables
-- This migration adds user_id columns to tables that don't have them

-- Add user_id to tasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        
        -- Update existing tasks with a default user_id if needed
        -- You may need to set a specific user_id here
        RAISE NOTICE 'Added user_id column to tasks table';
    END IF;
END $$;

-- Add user_id to subtasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE subtasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON subtasks(user_id);
        
        RAISE NOTICE 'Added user_id column to subtasks table';
    END IF;
END $$;

-- Add user_id to comments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
        
        RAISE NOTICE 'Added user_id column to comments table';
    END IF;
END $$;

-- Update RLS policies for subtasks
DROP POLICY IF EXISTS "Users can view subtasks on their tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can create subtasks on their tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can update subtasks on their tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks on their tasks" ON public.subtasks;

-- Enable RLS on subtasks
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for subtasks
CREATE POLICY "Users can view subtasks on their tasks" ON public.subtasks
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create subtasks on their tasks" ON public.subtasks
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update subtasks on their tasks" ON public.subtasks
    FOR UPDATE USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete subtasks on their tasks" ON public.subtasks
    FOR DELETE USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE user_id = auth.uid()
        )
    );

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id); 