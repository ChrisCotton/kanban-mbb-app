-- NUCLEAR OPTION: Temporarily remove constraint, fix data, restore constraint
-- Only use this if other methods fail!

BEGIN;

-- 1. DROP the NOT NULL constraint temporarily
ALTER TABLE categories 
ALTER COLUMN updated_by DROP NOT NULL;

-- 2. Fix ALL NULL values
UPDATE categories
SET updated_by = created_by
WHERE updated_by IS NULL;

-- 3. Change ownership
UPDATE categories
SET 
  created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b',
  updated_at = NOW()
WHERE created_by = '13178b88-fd93-4a65-8541-636c76dad940';

-- 4. Verify NO nulls remain
SELECT COUNT(*) as null_count
FROM categories
WHERE updated_by IS NULL;
-- Should be 0!

-- 5. RESTORE the NOT NULL constraint
ALTER TABLE categories 
ALTER COLUMN updated_by SET NOT NULL;

COMMIT;

-- 6. Final verification
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b' THEN 1 END) as yours
FROM categories;
