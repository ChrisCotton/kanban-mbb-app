-- Diagnostic: Check categories table structure and constraints

-- 1. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'categories'::regclass;

-- 3. Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'categories';

-- 4. Check current NULL values
SELECT 
  id,
  name,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM categories
WHERE updated_by IS NULL
ORDER BY name;

-- 5. Count by ownership
SELECT 
  created_by as owner,
  COUNT(*) as category_count,
  COUNT(CASE WHEN updated_by IS NULL THEN 1 END) as null_updated_by_count
FROM categories
GROUP BY created_by;
