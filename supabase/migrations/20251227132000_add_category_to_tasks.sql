-- Migration 008: Add category_id field to tasks table
-- This adds a foreign key relationship between tasks and categories

-- Add the category_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for faster category-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);

-- Create index for combined queries (user + category)
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category_id);

-- Update existing tasks to have a default category if needed
-- This will assign the first available category for each user to their existing tasks
DO $$
DECLARE
    user_record RECORD;
    default_category_id UUID;
BEGIN
    -- Loop through each user who has tasks but no categories assigned
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM tasks 
        WHERE category_id IS NULL
    LOOP
        -- Find the first category for this user (likely 'Development' from our defaults)
        SELECT id INTO default_category_id
        FROM categories 
        WHERE created_by = user_record.user_id 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- If user has categories, assign the first one to their uncategorized tasks
        IF default_category_id IS NOT NULL THEN
            UPDATE tasks 
            SET category_id = default_category_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = user_record.user_id 
            AND category_id IS NULL;
            
            RAISE NOTICE 'Updated tasks for user % with default category %', user_record.user_id, default_category_id;
        END IF;
    END LOOP;
END $$;

-- Add a comment to document the relationship
COMMENT ON COLUMN tasks.category_id IS 'Foreign key reference to categories table for task categorization and hourly rate calculation'; 