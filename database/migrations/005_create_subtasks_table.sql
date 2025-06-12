-- Migration: Create subtasks table
-- Task 1.3: Create subtasks table with foreign key to tasks

-- Drop table if exists (for development)
DROP TABLE IF EXISTS public.subtasks CASCADE;

-- Create subtasks table
CREATE TABLE public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT subtasks_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT subtasks_order_non_negative CHECK (order_index >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON public.subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_order ON public.subtasks(task_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON public.subtasks(completed);

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subtasks_updated_at ON public.subtasks;
CREATE TRIGGER trigger_update_subtasks_updated_at
    BEFORE UPDATE ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_subtasks_updated_at();

-- Function to automatically set order_index for new subtasks
CREATE OR REPLACE FUNCTION set_subtask_order()
RETURNS TRIGGER AS $$
BEGIN
    -- If order_index is not set or is 0, set it to the next available position
    IF NEW.order_index = 0 OR NEW.order_index IS NULL THEN
        SELECT COALESCE(MAX(order_index), 0) + 1
        INTO NEW.order_index
        FROM public.subtasks
        WHERE task_id = NEW.task_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_subtask_order ON public.subtasks;
CREATE TRIGGER trigger_set_subtask_order
    BEFORE INSERT ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION set_subtask_order(); 