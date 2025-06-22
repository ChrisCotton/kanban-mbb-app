-- Migration 003: Add urgent priority to task_priority enum if not exists
-- This ensures urgent priority is available in the system

DO $$ 
BEGIN
    -- Check if urgent value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'urgent' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_priority')
    ) THEN
        -- Add urgent priority to the enum
        ALTER TYPE task_priority ADD VALUE 'urgent';
        RAISE NOTICE 'Added urgent priority to task_priority enum';
    ELSE
        RAISE NOTICE 'Urgent priority already exists in task_priority enum';
    END IF;
END $$;

-- Update any existing tasks that might need the urgent priority
-- (This is optional - just ensuring the enum is available for use) 