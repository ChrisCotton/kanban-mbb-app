-- Migration: Convert earnings_usd from GENERATED column to regular column
-- Date: 2026-01-30
-- Issue: earnings_usd is a GENERATED column which cannot be updated directly
-- Solution: Drop the generated column, create a regular column, backfill data, then update trigger

-- Step 1: Check if earnings_usd is a generated column and convert it
DO $$
BEGIN
    -- Check if earnings_usd exists as a generated column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_sessions' 
        AND column_name = 'earnings_usd'
        AND is_generated = 'ALWAYS'
    ) THEN
        -- Drop the generated column
        ALTER TABLE time_sessions DROP COLUMN earnings_usd;
        
        -- Create a regular column
        ALTER TABLE time_sessions ADD COLUMN earnings_usd DECIMAL(12,2);
        
        RAISE NOTICE 'Converted earnings_usd from GENERATED to regular column';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_sessions' 
        AND column_name = 'earnings_usd'
        AND is_generated = 'NEVER'
    ) THEN
        RAISE NOTICE 'earnings_usd is already a regular column, no conversion needed';
    ELSE
        -- Column doesn't exist, create it
        ALTER TABLE time_sessions ADD COLUMN earnings_usd DECIMAL(12,2);
        RAISE NOTICE 'Created earnings_usd as regular column';
    END IF;
END $$;

-- Step 2: Backfill earnings for existing completed sessions
-- Calculate earnings from hourly_rate_usd or category rate
UPDATE time_sessions ts
SET 
    -- Calculate earnings from session hourly_rate_usd if available
    earnings_usd = CASE
        WHEN ts.hourly_rate_usd IS NOT NULL AND ts.hourly_rate_usd > 0 
             AND ts.ended_at IS NOT NULL AND ts.started_at IS NOT NULL THEN
            ROUND((EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::DECIMAL / 3600) * ts.hourly_rate_usd, 2)
        -- Otherwise, try to get rate from category
        WHEN ts.category_id IS NOT NULL 
             AND ts.ended_at IS NOT NULL AND ts.started_at IS NOT NULL THEN
            COALESCE(
                ROUND((EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::DECIMAL / 3600) * 
                    (SELECT hourly_rate_usd FROM categories WHERE id = ts.category_id), 2),
                NULL
            )
        ELSE NULL
    END,
    -- Also backfill hourly_rate_usd if it's NULL but category has a rate
    hourly_rate_usd = COALESCE(
        ts.hourly_rate_usd,
        (SELECT hourly_rate_usd FROM categories WHERE id = ts.category_id)
    )
WHERE 
    ts.ended_at IS NOT NULL 
    AND ts.is_active = false
    AND (ts.earnings_usd IS NULL OR ts.earnings_usd = 0)
    AND EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at)) > 0; -- Only sessions with valid duration

-- Step 3: Ensure the trigger function is updated (this should already be done by previous migration)
-- The trigger will now handle earnings calculation going forward
