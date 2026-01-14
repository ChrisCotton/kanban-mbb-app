-- SIMPLE OWNERSHIP TRANSFER
-- No NULL values exist, so this should work cleanly!

BEGIN;

-- Show what we're about to change
SELECT 
  'BEFORE' as status,
  id,
  name,
  created_by,
  updated_by
FROM categories
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940'
ORDER BY name;

-- Transfer ownership of 9 categories from old owner to current user
UPDATE categories
SET 
  created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_at = NOW()
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- Verify the transfer
SELECT 
  'AFTER' as status,
  COUNT(*) as total_categories
FROM categories
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b';
-- Should now show 11 (2 existing + 9 transferred)

-- Show all your categories
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
