-- Create kanban enums
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'doing', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'backlog',
    priority task_priority DEFAULT 'medium',
    due_date DATE,
    mbb_impact INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT comments_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_order_index ON public.subtasks(order_index);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subtasks_updated_at ON public.subtasks;
CREATE TRIGGER update_subtasks_updated_at
    BEFORE UPDATE ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-increment subtask order
CREATE OR REPLACE FUNCTION set_subtask_order_index()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_index IS NULL OR NEW.order_index = 0 THEN
        SELECT COALESCE(MAX(order_index), 0) + 1
        INTO NEW.order_index
        FROM public.subtasks
        WHERE task_id = NEW.task_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_subtask_order_trigger ON public.subtasks;
CREATE TRIGGER set_subtask_order_trigger
    BEFORE INSERT ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION set_subtask_order_index();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - will be restricted later with auth)
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Allow all operations on tasks" ON public.tasks
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on comments" ON public.comments;
CREATE POLICY "Allow all operations on comments" ON public.comments
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on subtasks" ON public.subtasks;
CREATE POLICY "Allow all operations on subtasks" ON public.subtasks
    FOR ALL USING (true) WITH CHECK (true); 