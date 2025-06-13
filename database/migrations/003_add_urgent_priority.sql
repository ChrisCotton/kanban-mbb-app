-- Add 'urgent' priority level to existing task_priority enum
ALTER TYPE task_priority ADD VALUE 'urgent';

-- Update any existing tasks that might need the urgent priority
-- (This is optional - just ensuring the enum is available for use) 