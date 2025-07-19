-- Migration 020: Fix foreign key relationships and add proper constraints
-- This migration ensures proper foreign key relationships between categories, tasks, and related tables

-- Drop existing foreign key constraint on tasks.category_id if it exists (to recreate with proper cascade)
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_category_id_fkey' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_category_id_fkey;
    END IF;
END $$;

-- Add proper foreign key constraint with CASCADE behavior for categories
ALTER TABLE tasks 
ADD CONSTRAINT tasks_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure proper foreign key constraints for time_sessions table
DO $$
BEGIN
    -- Check and fix time_sessions.category_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_sessions_category_id_fkey' 
        AND table_name = 'time_sessions'
    ) THEN
        ALTER TABLE time_sessions DROP CONSTRAINT time_sessions_category_id_fkey;
    END IF;
END $$;

ALTER TABLE time_sessions 
ADD CONSTRAINT time_sessions_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure proper foreign key constraints for time_sessions.task_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_sessions_task_id_fkey' 
        AND table_name = 'time_sessions'
    ) THEN
        ALTER TABLE time_sessions DROP CONSTRAINT time_sessions_task_id_fkey;
    END IF;
END $$;

ALTER TABLE time_sessions 
ADD CONSTRAINT time_sessions_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES tasks(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_category_user ON tasks(category_id, user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_category ON time_sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_task_category ON time_sessions(task_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_active ON categories(created_by, is_active);

-- Add check constraints for data integrity
ALTER TABLE categories 
ADD CONSTRAINT categories_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE categories 
ADD CONSTRAINT categories_color_format 
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Ensure tasks have proper constraints
ALTER TABLE tasks 
ADD CONSTRAINT tasks_title_not_empty 
CHECK (LENGTH(TRIM(title)) > 0);

-- Add constraint to ensure time_sessions have valid duration
ALTER TABLE time_sessions 
ADD CONSTRAINT time_sessions_valid_duration 
CHECK (ended_at IS NULL OR ended_at >= started_at);

-- Update any orphaned records (tasks with invalid category_id)
UPDATE tasks 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE categories.id = tasks.category_id
);

-- Update any orphaned time_sessions records
UPDATE time_sessions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE categories.id = time_sessions.category_id
);

-- Add comments for documentation
COMMENT ON CONSTRAINT tasks_category_id_fkey ON tasks IS 
'Foreign key to categories table with SET NULL on delete to preserve task history';

COMMENT ON CONSTRAINT time_sessions_category_id_fkey ON time_sessions IS 
'Foreign key to categories table with SET NULL on delete to preserve session history';

COMMENT ON CONSTRAINT time_sessions_task_id_fkey ON time_sessions IS 
'Foreign key to tasks table with CASCADE on delete since sessions are dependent on tasks';

-- Create function to validate category assignments
CREATE OR REPLACE FUNCTION validate_category_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user can only assign categories they own
    IF NEW.category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM categories 
            WHERE id = NEW.category_id 
            AND created_by = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Category does not exist or does not belong to user';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate category assignments on tasks
DROP TRIGGER IF EXISTS validate_task_category_assignment ON tasks;
CREATE TRIGGER validate_task_category_assignment
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_assignment();

-- Add trigger to validate category assignments on time_sessions
DROP TRIGGER IF EXISTS validate_session_category_assignment ON time_sessions;
CREATE TRIGGER validate_session_category_assignment
    BEFORE INSERT OR UPDATE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_assignment(); 