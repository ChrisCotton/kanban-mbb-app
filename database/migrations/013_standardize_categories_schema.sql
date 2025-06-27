-- Migration 013: Standardize Categories Schema and Fix Inconsistencies
-- This migration fixes the schema inconsistencies causing PGRST204 errors
-- and standardizes column naming across the entire system

-- ============================================================
-- PHASE 1: AUDIT AND BACKUP
-- ============================================================

-- Create a backup of existing categories data
CREATE TABLE IF NOT EXISTS categories_backup_20251227 AS 
SELECT * FROM categories;

-- Log current state for verification
DO $$
DECLARE 
    category_count INTEGER;
    has_hourly_rate BOOLEAN;
    has_hourly_rate_usd BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO category_count FROM categories;
    
    -- Check which hourly rate column exists
    has_hourly_rate := EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'hourly_rate'
    );
    
    has_hourly_rate_usd := EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'hourly_rate_usd'
    );
    
    RAISE NOTICE 'MIGRATION 013 START: % categories found', category_count;
    RAISE NOTICE 'Has hourly_rate column: %', has_hourly_rate;
    RAISE NOTICE 'Has hourly_rate_usd column: %', has_hourly_rate_usd;
END $$;

-- ============================================================
-- PHASE 2: SCHEMA STANDARDIZATION
-- ============================================================

-- Step 1: Add hourly_rate_usd column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'hourly_rate_usd'
    ) THEN
        ALTER TABLE categories ADD COLUMN hourly_rate_usd DECIMAL(10,2);
        RAISE NOTICE 'Added hourly_rate_usd column';
    ELSE
        RAISE NOTICE 'hourly_rate_usd column already exists';
    END IF;
END $$;

-- Step 2: Migrate data from hourly_rate to hourly_rate_usd
DO $$
BEGIN
    -- Only migrate if hourly_rate_usd is null/empty and hourly_rate has data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'hourly_rate'
    ) THEN
        UPDATE categories 
        SET hourly_rate_usd = hourly_rate 
        WHERE hourly_rate_usd IS NULL 
        AND hourly_rate IS NOT NULL;
        
        RAISE NOTICE 'Migrated data from hourly_rate to hourly_rate_usd';
    END IF;
END $$;

-- Step 3: Add NOT NULL constraint and check constraint
ALTER TABLE categories 
ALTER COLUMN hourly_rate_usd SET NOT NULL,
ADD CONSTRAINT categories_hourly_rate_usd_positive 
    CHECK (hourly_rate_usd >= 0);

-- Step 4: Add missing description column if needed
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
END $$;

-- Step 5: Ensure proper data types for all columns
ALTER TABLE categories 
ALTER COLUMN name TYPE VARCHAR(100),
ALTER COLUMN color TYPE VARCHAR(7),
ALTER COLUMN icon TYPE VARCHAR(10);

-- ============================================================
-- PHASE 3: INDEXES AND CONSTRAINTS
-- ============================================================

-- Drop old indexes that might conflict
DROP INDEX IF EXISTS idx_categories_name;
DROP INDEX IF EXISTS idx_categories_active;
DROP INDEX IF EXISTS idx_categories_created_by;
DROP INDEX IF EXISTS idx_categories_user_id;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_name_created_by ON categories(name, created_by);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_hourly_rate ON categories(hourly_rate_usd);

-- Fix unique constraint to be per user
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_user_unique;
ALTER TABLE categories ADD CONSTRAINT categories_name_created_by_unique 
    UNIQUE (name, created_by);

-- ============================================================
-- PHASE 4: ROW LEVEL SECURITY UPDATE
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all RLS policies with correct logic
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;

-- Create new RLS policies using created_by (not user_id)
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- PHASE 5: TRIGGER FUNCTIONS UPDATE
-- ============================================================

-- Drop and recreate the updated_at trigger function
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
DROP FUNCTION IF EXISTS update_categories_updated_at();

CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- ============================================================
-- PHASE 6: FOREIGN KEY RELATIONSHIPS
-- ============================================================

-- Ensure tasks.category_id properly references categories.id
-- First check if the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added category_id column to tasks table';
    END IF;
END $$;

-- Create index for category_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category_id);

-- ============================================================
-- PHASE 7: CLEANUP OLD COLUMNS (OPTIONAL - COMMENTED FOR SAFETY)
-- ============================================================

-- WARNING: Only uncomment these after verifying everything works
-- ALTER TABLE categories DROP COLUMN IF EXISTS hourly_rate;
-- ALTER TABLE categories DROP COLUMN IF EXISTS user_id;

-- ============================================================
-- PHASE 8: VERIFICATION AND LOGGING
-- ============================================================

DO $$
DECLARE 
    final_count INTEGER;
    sample_record RECORD;
BEGIN
    SELECT COUNT(*) INTO final_count FROM categories;
    RAISE NOTICE 'MIGRATION 013 COMPLETE: % categories after migration', final_count;
    
    -- Show sample record to verify structure
    SELECT * INTO sample_record FROM categories LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample record structure verified: name=%, hourly_rate_usd=%', 
            sample_record.name, sample_record.hourly_rate_usd;
    END IF;
    
    RAISE NOTICE 'Migration 013 completed successfully!';
END $$;

-- Add comments for documentation
COMMENT ON TABLE categories IS 'Task categories with standardized hourly_rate_usd column naming';
COMMENT ON COLUMN categories.hourly_rate_usd IS 'Hourly rate in USD for MBB calculations';
COMMENT ON COLUMN categories.created_by IS 'User ID of category creator (used for RLS)';
COMMENT ON COLUMN categories.updated_by IS 'User ID of last updater'; 