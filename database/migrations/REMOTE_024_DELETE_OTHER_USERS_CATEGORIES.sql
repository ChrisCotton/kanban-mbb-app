-- REMOTE_024: Delete all categories NOT owned by thediabolicalmr4dee@gmail.com
-- This is the TRUE nuclear option - removes all foreign categories

BEGIN;

-- Step 1: Find your user_id from email
-- Run this first to verify it's correct:
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'thediabolicalmr4dee@gmail.com';

-- Expected result: 2f7fa856-668b-4c0f-b9df-73c92c737e1b

-- Step 2: Show what will be DELETED (9 categories from old owner)
SELECT 
  'WILL BE DELETED' as status,
  id,
  name,
  created_by,
  created_at
FROM categories
WHERE created_by != '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;

-- Step 3: Show what will be KEPT (your 2 categories)
SELECT 
  'WILL BE KEPT' as status,
  id,
  name,
  created_by,
  created_at
FROM categories
WHERE created_by = '2f7fa856-668b-4c0f-b9df-73c92c737e1b'
ORDER BY name;

-- Step 4: DELETE all categories you don't own
DELETE FROM categories
WHERE created_by != '2f7fa856-668b-4c0f-b9df-73c92c737e1b';

-- Step 5: Verify - should only show YOUR categories now
SELECT 
  'FINAL RESULT' as status,
  COUNT(*) as total_categories,
  COUNT(DISTINCT created_by) as unique_owners
FROM categories;
-- Should show: unique_owners = 1 (only you)

-- Step 6: List your remaining categories
SELECT 
  id,
  name,
  hourly_rate_usd as rate,
  is_active,
  created_at
FROM categories
ORDER BY name;

COMMIT;
