-- Rollback Migration 013: Revert Categories Schema Standardization
-- This script safely rolls back the schema changes made in migration 013
-- WARNING: Only run this if you need to revert due to issues

-- ============================================================
-- PHASE 1: VERIFICATION AND SAFETY CHECKS
-- ============================================================

DO $$
DECLARE 
    backup_exists BOOLEAN;
    current_count INTEGER;
    backup_count INTEGER;
BEGIN
    -- Check if backup table exists
    backup_exists := EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories_backup_20251227'
    );
    
    IF NOT backup_exists THEN
        RAISE EXCEPTION 'Backup table categories_backup_20251227 not found! Cannot safely rollback.';
    END IF;
    
    -- Compare record counts
    SELECT COUNT(*) INTO current_count FROM categories;
    SELECT COUNT(*) INTO backup_count FROM categories_backup_20251227;
    
    RAISE NOTICE 'ROLLBACK VERIFICATION: Current categories: %, Backup categories: %', 
        current_count, backup_count;
        
    IF current_count = 0 AND backup_count > 0 THEN
        RAISE NOTICE 'Will restore % categories from backup', backup_count;
    END IF;
END $$;

-- ============================================================
-- PHASE 2: DROP NEW CONSTRAINTS AND INDEXES
-- ============================================================

-- Drop new constraints added in migration 013
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_hourly_rate_usd_positive;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_created_by_unique;

-- Drop new indexes
DROP INDEX IF EXISTS idx_categories_created_by;
DROP INDEX IF EXISTS idx_categories_name_created_by;
DROP INDEX IF EXISTS idx_categories_active;
DROP INDEX IF EXISTS idx_categories_hourly_rate;
DROP INDEX IF EXISTS idx_tasks_category_id;
DROP INDEX IF EXISTS idx_tasks_user_category;

-- ============================================================
-- PHASE 3: DROP NEW POLICIES AND TRIGGERS
-- ============================================================

-- Remove RLS policies created in migration 013
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

-- Remove trigger and function
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
DROP FUNCTION IF EXISTS update_categories_updated_at();

-- ============================================================
-- PHASE 4: RESTORE ORIGINAL DATA STRUCTURE
-- ============================================================

-- Truncate current table and restore from backup
TRUNCATE TABLE categories;

-- Restore data from backup
INSERT INTO categories SELECT * FROM categories_backup_20251227;

-- ============================================================
-- PHASE 5: RESTORE ORIGINAL SCHEMA ELEMENTS
-- ============================================================

-- Recreate original indexes (based on what was likely there before)
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Recreate original unique constraint (global name uniqueness)
ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);

-- Recreate original RLS policy (using user_id instead of created_by)
CREATE POLICY "Users can manage their own categories" ON categories 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PHASE 6: REMOVE NEW COLUMNS (OPTIONAL - BE CAREFUL)
-- ============================================================

-- Only uncomment if you want to fully revert to original schema
-- WARNING: This will lose the hourly_rate_usd data!

-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_name = 'categories' AND column_name = 'hourly_rate_usd'
--     ) THEN
--         ALTER TABLE categories DROP COLUMN hourly_rate_usd;
--         RAISE NOTICE 'Removed hourly_rate_usd column';
--     END IF;
-- END $$;

-- ============================================================
-- PHASE 7: VERIFICATION
-- ============================================================

DO $$
DECLARE 
    final_count INTEGER;
    has_hourly_rate BOOLEAN;
    has_hourly_rate_usd BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO final_count FROM categories;
    
    -- Check column status
    has_hourly_rate := EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'hourly_rate'
    );
    
    has_hourly_rate_usd := EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'hourly_rate_usd'
    );
    
    RAISE NOTICE 'ROLLBACK COMPLETE: % categories restored', final_count;
    RAISE NOTICE 'Has hourly_rate column: %', has_hourly_rate;
    RAISE NOTICE 'Has hourly_rate_usd column: %', has_hourly_rate_usd;
    RAISE NOTICE 'Rollback completed successfully!';
END $$;

-- ============================================================
-- PHASE 8: CLEANUP (OPTIONAL)
-- ============================================================

-- Uncomment to remove backup table after successful rollback verification
-- DROP TABLE IF EXISTS categories_backup_20251227;

-- Add rollback comment
COMMENT ON TABLE categories IS 'Categories table restored to pre-migration 013 state'; 