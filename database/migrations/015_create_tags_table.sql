-- Migration 015: Create tags table and task_tags junction table
-- This adds a flexible tagging system for task organization and filtering

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create task_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, tag_id) -- Prevent duplicate tag assignments
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON tags(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Add unique constraint for tag names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_user ON tags(name, created_by);

-- Add RLS policies for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tags
CREATE POLICY "Users can view their own tags" ON tags
    FOR SELECT USING (auth.uid() = created_by);

-- Users can create their own tags
CREATE POLICY "Users can create their own tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own tags
CREATE POLICY "Users can update their own tags" ON tags
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own tags
CREATE POLICY "Users can delete their own tags" ON tags
    FOR DELETE USING (auth.uid() = created_by);

-- Users can view task_tags for their own tasks
CREATE POLICY "Users can view task_tags for their own tasks" ON task_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

-- Users can create task_tags for their own tasks
CREATE POLICY "Users can create task_tags for their own tasks" ON task_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

-- Users can delete task_tags for their own tasks
CREATE POLICY "Users can delete task_tags for their own tasks" ON task_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

-- Add updated_at trigger for tags
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tags_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tags IS 'User-defined tags for task organization and filtering';
COMMENT ON TABLE task_tags IS 'Junction table for many-to-many relationship between tasks and tags';
COMMENT ON COLUMN tags.name IS 'Tag name, must be unique per user';
COMMENT ON COLUMN tags.color IS 'Hex color code for tag display';
COMMENT ON COLUMN task_tags.task_id IS 'Foreign key reference to tasks table';
COMMENT ON COLUMN task_tags.tag_id IS 'Foreign key reference to tags table'; 