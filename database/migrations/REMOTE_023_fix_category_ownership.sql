-- REMOTE_023: Fix Category Ownership
-- Updates categories owned by old user to current authenticated user
-- 
-- Issue: Categories created with user ID '13178b88-fd93-4a65-8541-636c76dad940'
-- but current auth user is '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
--
-- This prevents users from deleting/editing their own categories

-- First, verify current ownership
SELECT 
  id,
  name,
  created_by,
  created_at
FROM categories
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- Update all categories to be owned by current user
-- Note: Using COALESCE to handle NULL updated_by values
UPDATE categories
SET 
  created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_by = COALESCE(updated_by, '2f7fa856-668b-4c0f-b9df-73c92c737e1b'),
  updated_at = NOW()
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- Also fix any categories where updated_by is NULL
UPDATE categories
SET updated_by = created_by
WHERE updated_by IS NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_categories,
  created_by as owner_id
FROM categories
GROUP BY created_by;

-- Show all categories now owned by current user
SELECT 
  id,
  name,
  created_by,
  updated_at
FROM categories
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;
