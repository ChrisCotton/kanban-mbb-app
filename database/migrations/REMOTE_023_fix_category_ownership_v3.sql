-- REMOTE_023: Fix Category Ownership (V3 - Single Transaction)
-- Fixes NULL updated_by and ownership in one atomic operation

BEGIN;

-- Update ALL categories at once:
-- 1. Set updated_by to created_by if NULL
-- 2. Change ownership from old user to new user
UPDATE categories
SET 
  updated_by = COALESCE(updated_by, created_by, '2f7fa856-668b-4c0f-b9df-73c92c737e1b'),
  created_by = CASE 
    WHEN created_by = '13178b88-fd93-4a65-8541-636c76dad940' 
    THEN '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
    ELSE created_by
  END,
  updated_at = NOW();

-- Verify results
SELECT 
  COUNT(*) as total_categories,
  COUNT(CASE WHEN updated_by IS NULL THEN 1 END) as null_updated_by,
  COUNT(CASE WHEN created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b' THEN 1 END) as owned_by_current_user
FROM categories;

COMMIT;

-- Final verification
SELECT 
  id,
  name,
  created_by,
  updated_by,
  is_active
FROM categories
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;
