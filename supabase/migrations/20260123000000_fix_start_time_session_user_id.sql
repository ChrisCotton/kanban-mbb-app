-- Migration: Fix start_time_session to accept p_user_id parameter
-- Date: 2026-01-23
-- Issue: Function uses auth.uid() which returns NULL when called with service role key
-- Solution: Add p_user_id parameter and use COALESCE to support both auth.uid() and explicit user_id

-- Function to start a new time session (updated to accept p_user_id)
CREATE OR REPLACE FUNCTION start_time_session(
    p_task_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_hourly_rate_usd DECIMAL(10,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    task_category_id UUID;
    category_rate DECIMAL(10,2);
    task_user_id UUID;
    effective_user_id UUID;
BEGIN
    -- Determine effective user_id: use provided parameter, fallback to auth.uid()
    effective_user_id := COALESCE(p_user_id, auth.uid());
    
    IF effective_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required. Either provide p_user_id or ensure auth.uid() is available';
    END IF;
    
    -- Get task details and verify ownership
    SELECT user_id, category_id INTO task_user_id, task_category_id
    FROM tasks 
    WHERE id = p_task_id AND user_id = effective_user_id;
    
    IF task_user_id IS NULL THEN
        RAISE EXCEPTION 'Task not found or access denied';
    END IF;
    
    -- End any currently active sessions for this user
    UPDATE time_sessions 
    SET ended_at = CURRENT_TIMESTAMP,
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = effective_user_id 
    AND is_active = true 
    AND ended_at IS NULL;
    
    -- Get hourly rate from category if not provided
    IF p_hourly_rate_usd IS NULL AND task_category_id IS NOT NULL THEN
        SELECT hourly_rate_usd INTO category_rate
        FROM categories 
        WHERE id = task_category_id AND created_by = effective_user_id;
        
        p_hourly_rate_usd := category_rate;
    END IF;
    
    -- Create new session
    INSERT INTO time_sessions (
        task_id, 
        user_id, 
        category_id, 
        hourly_rate_usd,
        is_active
    ) VALUES (
        p_task_id,
        effective_user_id,
        task_category_id,
        p_hourly_rate_usd,
        true
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION start_time_session(UUID, UUID, DECIMAL) IS 
'Starts a new time session for a task. Accepts p_user_id parameter to support service role key calls where auth.uid() returns NULL. Falls back to auth.uid() if p_user_id is not provided.';
