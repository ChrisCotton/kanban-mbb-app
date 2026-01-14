-- REMOTE_023: Fix Category Ownership (FINAL - Two Pass Fix)
-- Pass 1: Fix ALL NULL updated_by values
-- Pass 2: Change ownership

BEGIN;

-- PASS 1: Fix NULL updated_by for ALL categories
-- This MUST happen first, before any other updates
UPDATE categories
SET 
  updated_by = created_by,
  updated_at = NOW()
WHERE updated_by IS NULL;

-- Verify Pass 1
SELECT 'After Pass 1:' as status, COUNT(*) as categories_with_null_updated_by
FROM categories
WHERE updated_by IS NULL;
-- Should be 0

-- PASS 2: Now change ownership (updated_by is guaranteed non-NULL now)
UPDATE categories
SET 
  created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_at = NOW()
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- Final verification
SELECT 
  'Final Results:' as status,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN updated_by IS NULL THEN 1 END) as null_updated_by,
  COUNT(CASE WHEN created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b' THEN 1 END) as owned_by_you
FROM categories;

COMMIT;

-- Show your categories
SELECT id, name, created_by, updated_by 
FROM categories 
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;
