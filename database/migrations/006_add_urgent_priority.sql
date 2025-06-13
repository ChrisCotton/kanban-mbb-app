-- Migration 006: Add 'urgent' priority to task_priority enum
-- This adds the missing 'urgent' value to the existing enum

-- Add 'urgent' priority level to existing task_priority enum
ALTER TYPE task_priority ADD VALUE 'urgent';

-- Verify the enum values (optional - for debugging)
-- SELECT enumlabel as priority_value 
-- FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_priority')
-- ORDER BY enumsortorder; 