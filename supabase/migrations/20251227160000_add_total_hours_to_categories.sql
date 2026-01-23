-- Migration 014: Add total_hours column for category time tracking
-- This adds time tracking analytics to categories

-- STEP 1: Fix any existing NULL updated_by values BEFORE adding the column
-- This prevents constraint violations during the migration
UPDATE categories
SET updated_by = COALESCE(updated_by, created_by)
WHERE updated_by IS NULL AND created_by IS NOT NULL;

-- STEP 2: Fix the trigger function to handle NULL auth.uid() properly
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    -- Always ensure updated_by is set (never NULL)
    NEW.updated_by = COALESCE(
        NEW.updated_by,  -- Use explicitly set value first
        auth.uid(),      -- Then try current user
        OLD.updated_by,  -- Then preserve existing updated_by
        OLD.created_by   -- Finally fall back to created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Add total_hours column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10,2) DEFAULT 0.0 NOT NULL 
CHECK (total_hours >= 0);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_total_hours ON categories(total_hours);

-- Function to calculate total hours for a category from time_sessions
CREATE OR REPLACE FUNCTION calculate_category_total_hours(p_category_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_hours NUMERIC;
BEGIN
    SELECT COALESCE(SUM(duration_seconds::NUMERIC / 3600), 0)
    INTO total_hours
    FROM time_sessions 
    WHERE category_id = p_category_id 
    AND ended_at IS NOT NULL;
    
    RETURN ROUND(total_hours, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update category total_hours
CREATE OR REPLACE FUNCTION update_category_total_hours(p_category_id UUID)
RETURNS VOID AS $$
DECLARE
    new_total_hours NUMERIC;
    category_owner UUID;
    category_created_by UUID;
BEGIN
    -- Calculate the new total hours
    new_total_hours := calculate_category_total_hours(p_category_id);
    
    -- Get both updated_by and created_by separately to ensure we have a value
    SELECT updated_by, created_by INTO category_owner, category_created_by
    FROM categories
    WHERE id = p_category_id;
    
    -- Ensure we have a valid owner (use created_by if updated_by is NULL)
    category_owner := COALESCE(category_owner, category_created_by);
    
    -- Only update if we have a valid owner
    IF category_owner IS NOT NULL THEN
        -- Update with explicit updated_by
        -- The trigger function (updated above) will preserve this value
        UPDATE categories 
        SET total_hours = new_total_hours,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = category_owner
        WHERE id = p_category_id;
    ELSE
        -- Log a warning but don't fail - skip categories with NULL owners
        RAISE WARNING 'Skipping category % - both updated_by and created_by are NULL', p_category_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh all category total_hours
CREATE OR REPLACE FUNCTION refresh_all_category_total_hours()
RETURNS INTEGER AS $$
DECLARE
    category_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Only process categories that have a valid owner (created_by is NOT NULL)
    -- Skip categories with NULL created_by to avoid constraint violations
    FOR category_record IN 
        SELECT id FROM categories 
        WHERE is_active = true 
        AND created_by IS NOT NULL
    LOOP
        BEGIN
            PERFORM update_category_total_hours(category_record.id);
            updated_count := updated_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but continue with other categories
                RAISE WARNING 'Failed to update category %: %', category_record.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically update category total_hours when time_sessions change
CREATE OR REPLACE FUNCTION trigger_update_category_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE cases
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.category_id IS NOT NULL THEN
            PERFORM update_category_total_hours(NEW.category_id);
        END IF;
    END IF;
    
    -- Handle UPDATE case where category_id changed
    IF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
        IF OLD.category_id IS NOT NULL THEN
            PERFORM update_category_total_hours(OLD.category_id);
        END IF;
    END IF;
    
    -- Handle DELETE case
    IF TG_OP = 'DELETE' THEN
        IF OLD.category_id IS NOT NULL THEN
            PERFORM update_category_total_hours(OLD.category_id);
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update category total_hours
DROP TRIGGER IF EXISTS trigger_time_sessions_update_category_hours ON time_sessions;
CREATE TRIGGER trigger_time_sessions_update_category_hours
    AFTER INSERT OR UPDATE OR DELETE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_category_hours();

-- Initialize total_hours for existing categories
SELECT refresh_all_category_total_hours();

-- Add comments for documentation
COMMENT ON COLUMN categories.total_hours IS 'Total hours tracked for this category across all time sessions';
COMMENT ON FUNCTION calculate_category_total_hours(UUID) IS 'Calculates total hours for a category from completed time sessions';
COMMENT ON FUNCTION update_category_total_hours(UUID) IS 'Updates the total_hours field for a specific category';
COMMENT ON FUNCTION refresh_all_category_total_hours() IS 'Refreshes total_hours for all active categories';
COMMENT ON FUNCTION trigger_update_category_hours() IS 'Trigger function to auto-update category total_hours when time_sessions change'; 