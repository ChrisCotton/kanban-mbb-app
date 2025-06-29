-- Migration 014: Add total_hours column for category time tracking
-- This adds time tracking analytics to categories

-- Add total_hours column to categories table
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
BEGIN
    -- Calculate the new total hours
    new_total_hours := calculate_category_total_hours(p_category_id);
    
    -- Update the category
    UPDATE categories 
    SET total_hours = new_total_hours,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_category_id;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all category total_hours
CREATE OR REPLACE FUNCTION refresh_all_category_total_hours()
RETURNS INTEGER AS $$
DECLARE
    category_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR category_record IN 
        SELECT id FROM categories WHERE is_active = true
    LOOP
        PERFORM update_category_total_hours(category_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

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