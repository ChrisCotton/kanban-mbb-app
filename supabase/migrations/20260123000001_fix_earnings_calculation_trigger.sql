-- Migration: Fix earnings calculation trigger to calculate duration directly
-- Date: 2026-01-23
-- Issue: Trigger uses NEW.duration_seconds which is a generated column that may not be updated yet
-- Solution: Calculate duration directly from ended_at - started_at in the trigger

-- Create trigger to update updated_at timestamp and calculate earnings
CREATE OR REPLACE FUNCTION update_time_sessions_updated_at()
RETURNS TRIGGER AS $$
DECLARE
    calculated_duration_seconds INTEGER;
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Calculate earnings when session ends
    -- Calculate duration directly from timestamps since duration_seconds is a generated column
    -- that may not be updated yet when this trigger runs
    IF NEW.ended_at IS NOT NULL AND NEW.hourly_rate_usd IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        calculated_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
        NEW.earnings_usd = ROUND((calculated_duration_seconds::DECIMAL / 3600) * NEW.hourly_rate_usd, 2);
    ELSIF NEW.ended_at IS NULL THEN
        -- Clear earnings if session is reactivated
        NEW.earnings_usd = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION update_time_sessions_updated_at() IS 
'Trigger function that calculates earnings_usd when a session ends. Calculates duration directly from timestamps to avoid dependency on generated column.';
