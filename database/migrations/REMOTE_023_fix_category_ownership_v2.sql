-- REMOTE_023: Fix Category Ownership (V2 - Safe Version)
-- Handles NULL values in updated_by column

-- STEP 1: First, fix any NULL updated_by values (set to created_by)
UPDATE categories
SET updated_by = created_by
WHERE updated_by IS NULL;

-- STEP 2: Verify no more NULLs
SELECT COUNT(*) as categories_with_null_updated_by
FROM categories
WHERE updated_by IS NULL;
-- This should return 0

-- STEP 3: Now update ownership from old user to current user
UPDATE categories
SET 
  created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_at = NOW()
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- STEP 4: Verify the fix
SELECT 
  COUNT(*) as total_categories,
  created_by as owner_id,
  COUNT(CASE WHEN updated_by IS NULL THEN 1 END) as null_updated_by_count
FROM categories
GROUP BY created_by;

-- STEP 5: Show all categories now
SELECT 
  id,
  name,
  created_by,
  updated_by,
  is_active
FROM categories
ORDER BY name;
