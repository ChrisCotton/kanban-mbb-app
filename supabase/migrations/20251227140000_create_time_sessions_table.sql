-- Migration 009: Create time_sessions table
-- This table tracks work periods for tasks to calculate MBB earnings

CREATE TABLE IF NOT EXISTS time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Time tracking fields
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN ended_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
            ELSE NULL 
        END
    ) STORED,
    
    -- MBB calculation fields
    hourly_rate_usd DECIMAL(10,2), -- Snapshot of rate at time of session
    earnings_usd DECIMAL(12,2), -- Calculated by trigger when session ends
    
    -- Session metadata
    is_active BOOLEAN DEFAULT true, -- For currently running sessions
    session_notes TEXT, -- Optional notes about the work session
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (
        ended_at IS NULL OR ended_at >= started_at
    ),
    CONSTRAINT valid_duration CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    ),
    CONSTRAINT valid_hourly_rate CHECK (
        hourly_rate_usd IS NULL OR hourly_rate_usd >= 0
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_sessions_task_id ON time_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_id ON time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_category_id ON time_sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_active ON time_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_time_sessions_started_at ON time_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_started ON time_sessions(user_id, started_at);

-- Enable Row Level Security
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own time sessions" ON time_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time sessions" ON time_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time sessions" ON time_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time sessions" ON time_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp and calculate earnings
CREATE OR REPLACE FUNCTION update_time_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Calculate earnings when session ends
    IF NEW.ended_at IS NOT NULL AND NEW.hourly_rate_usd IS NOT NULL THEN
        NEW.earnings_usd = ROUND((NEW.duration_seconds::DECIMAL / 3600) * NEW.hourly_rate_usd, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_time_sessions_updated_at
    BEFORE UPDATE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sessions_updated_at();

-- Function to start a new time session
CREATE OR REPLACE FUNCTION start_time_session(
    p_task_id UUID,
    p_hourly_rate_usd DECIMAL(10,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    task_category_id UUID;
    category_rate DECIMAL(10,2);
    task_user_id UUID;
BEGIN
    -- Get task details and verify ownership
    SELECT user_id, category_id INTO task_user_id, task_category_id
    FROM tasks 
    WHERE id = p_task_id AND user_id = auth.uid();
    
    IF task_user_id IS NULL THEN
        RAISE EXCEPTION 'Task not found or access denied';
    END IF;
    
    -- End any currently active sessions for this user
    UPDATE time_sessions 
    SET ended_at = CURRENT_TIMESTAMP,
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND ended_at IS NULL;
    
    -- Get hourly rate from category if not provided
    IF p_hourly_rate_usd IS NULL AND task_category_id IS NOT NULL THEN
        SELECT hourly_rate_usd INTO category_rate
        FROM categories 
        WHERE id = task_category_id AND created_by = auth.uid();
        
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
        auth.uid(),
        task_category_id,
        p_hourly_rate_usd,
        true
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a time session
CREATE OR REPLACE FUNCTION end_time_session(p_session_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- If no session ID provided, end the most recent active session
    IF p_session_id IS NULL THEN
        SELECT id INTO session_id
        FROM time_sessions
        WHERE user_id = auth.uid() 
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
    AND user_id = auth.uid()
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active session not found';
    END IF;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE time_sessions IS 'Tracks work sessions for tasks to calculate MBB earnings';
COMMENT ON COLUMN time_sessions.duration_seconds IS 'Automatically calculated duration in seconds when session ends';
COMMENT ON COLUMN time_sessions.earnings_usd IS 'Calculated earnings based on duration and hourly rate';
COMMENT ON COLUMN time_sessions.hourly_rate_usd IS 'Snapshot of hourly rate at time of session start';
COMMENT ON COLUMN time_sessions.is_active IS 'Indicates if this is a currently running session'; 