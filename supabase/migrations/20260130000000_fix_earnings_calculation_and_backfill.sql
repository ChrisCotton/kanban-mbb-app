-- Migration: Fix earnings calculation and backfill missing earnings
-- Date: 2026-01-30
-- Issue: Completed time sessions have NULL earnings_usd, making historical data unreliable
-- Root Cause: hourly_rate_usd may be NULL when sessions start, preventing trigger from calculating earnings
-- Solution: 
--   1. Update trigger to look up category hourly_rate if session hourly_rate_usd is NULL
--   2. Backfill earnings for existing sessions with NULL earnings_usd but valid ended_at

-- Step 1: Update the trigger function to look up category rate if hourly_rate_usd is NULL
CREATE OR REPLACE FUNCTION update_time_sessions_updated_at()
RETURNS TRIGGER AS $$
DECLARE
    calculated_duration_seconds INTEGER;
    effective_hourly_rate DECIMAL(10,2);
    session_category_id UUID;
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Calculate earnings when session ends
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        -- Calculate duration directly from timestamps
        calculated_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
        
        -- Determine effective hourly rate
        -- First try session's hourly_rate_usd, then look up from category if NULL
        effective_hourly_rate := NEW.hourly_rate_usd;
        
        IF effective_hourly_rate IS NULL THEN
            -- Get category_id from the session
            session_category_id := NEW.category_id;
            
            -- If we have a category_id, try to get hourly_rate from category
            IF session_category_id IS NOT NULL THEN
                SELECT hourly_rate_usd INTO effective_hourly_rate
                FROM categories
                WHERE id = session_category_id;
            END IF;
        END IF;
        
        -- Calculate earnings if we have a valid hourly rate
        IF effective_hourly_rate IS NOT NULL AND effective_hourly_rate > 0 THEN
            NEW.earnings_usd := ROUND((calculated_duration_seconds::DECIMAL / 3600) * effective_hourly_rate, 2);
            
            -- Also update hourly_rate_usd if it was NULL (for future reference)
            IF NEW.hourly_rate_usd IS NULL THEN
                NEW.hourly_rate_usd := effective_hourly_rate;
            END IF;
        ELSE
            -- No hourly rate available, set earnings to NULL
            NEW.earnings_usd := NULL;
        END IF;
    ELSIF NEW.ended_at IS NULL THEN
        -- Clear earnings if session is reactivated
        NEW.earnings_usd := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS trigger_time_sessions_updated_at ON time_sessions;
CREATE TRIGGER trigger_time_sessions_updated_at
    BEFORE UPDATE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sessions_updated_at();

-- Step 2: Backfill earnings moved to separate migration (20260130000002_convert_earnings_to_regular_column.sql)
-- This is because earnings_usd might be a GENERATED column which cannot be updated directly
-- The separate migration will handle column type conversion and backfilling

-- Add comment for documentation
COMMENT ON FUNCTION update_time_sessions_updated_at() IS 
'Trigger function that calculates earnings_usd when a session ends. Looks up category hourly_rate if session hourly_rate_usd is NULL. Calculates duration directly from timestamps.';
