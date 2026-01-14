-- REMOTE_023: Fix Category Ownership (V4 - Fix ALL categories)
-- Problem: Some categories have updated_by = NULL regardless of owner
-- Solution: Update EVERY category in the table

BEGIN;

-- First: Show the problem
SELECT 
  id,
  name,
  created_by,
  updated_by,
  CASE WHEN updated_by IS NULL THEN 'NULL!' ELSE 'OK' END as updated_by_status
FROM categories
WHERE updated_by IS NULL
ORDER BY name;

-- Second: Fix ALL categories (not just old owner's)
-- This ensures updated_by is NEVER null for ANY category
UPDATE categories
SET 
  -- Fix updated_by for ALL rows
  updated_by = CASE
    WHEN updated_by IS NULL THEN COALESCE(created_by, '2f7fa856-668b-4c0f-b9df-73c92c737e1b')
    ELSE updated_by
  END,
  -- Change ownership only for old owner's categories
  created_by = CASE 
    WHEN created_by = '13178b88-fd93-4a65-8541-636c76dad940' 
    THEN '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
    ELSE created_by
  END,
  updated_at = NOW();

-- Third: Verify NO nulls remain
SELECT 
  COUNT(*) as total_categories,
  COUNT(CASE WHEN updated_by IS NULL THEN 1 END) as null_updated_by_count,
  COUNT(CASE WHEN created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b' THEN 1 END) as owned_by_current_user
FROM categories;

-- Fourth: Show updated categories
SELECT 
  id,
  name,
  created_by,
  updated_by,
  is_active
FROM categories
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;

COMMIT;
