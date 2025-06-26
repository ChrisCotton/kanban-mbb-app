-- Migration 012: Fix categories table unique constraint
-- Change from global unique name to unique name per user

-- Drop the existing unique constraint if it exists
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add unique constraint per user
ALTER TABLE categories ADD CONSTRAINT categories_name_user_unique UNIQUE (name, created_by);

-- Drop and recreate the trigger function to ensure it's correct
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
DROP FUNCTION IF EXISTS update_categories_updated_at();

CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at(); 