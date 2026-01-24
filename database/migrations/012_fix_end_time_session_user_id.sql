-- Migration: Fix end_time_session function to accept p_user_id parameter
-- Date: 2026-01-23
-- Issue: Function overloading ambiguity - PostgreSQL can't choose between two versions
-- Solution: Update end_time_session to accept p_user_id (like start_time_session) and use COALESCE pattern

-- Drop all existing versions first to avoid ambiguity
DROP FUNCTION IF EXISTS end_time_session(UUID);
DROP FUNCTION IF EXISTS end_time_session(UUID, UUID);

-- Create updated function with p_user_id parameter
CREATE OR REPLACE FUNCTION end_time_session(
    p_session_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    effective_user_id UUID;
BEGIN
    -- Determine effective user_id: use provided parameter, fallback to auth.uid()
    effective_user_id := COALESCE(p_user_id, auth.uid());
    
    IF effective_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required. Either provide p_user_id or ensure auth.uid() is available';
    END IF;
    
    -- If no session ID provided, end the most recent active session
    IF p_session_id IS NULL THEN
        SELECT id INTO session_id
        FROM time_sessions
        WHERE user_id = effective_user_id 
        AND is_active = true 
        AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1;
    ELSE
        session_id := p_session_id;
    END IF;
    
    -- Update the session
    UPDATE time_sessions 
    SET ended_at = CURRENT_TIMESTAMP,
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = session_id 
    AND user_id = effective_user_id
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active session not found';
    END IF;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION end_time_session(UUID, UUID) IS 
'Ends a time session. Accepts p_user_id to work with service role key. Uses COALESCE to prioritize provided user_id over auth.uid().';
