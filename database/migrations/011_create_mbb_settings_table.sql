-- Migration 011: Create mbb_settings table
-- This table stores Mental Bank Balance settings and targets for each user

CREATE TABLE IF NOT EXISTS mbb_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- MBB Target Settings
    target_balance_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (target_balance_usd >= 0),
    target_description TEXT, -- Description of what the target represents
    target_deadline DATE, -- Optional deadline for achieving target
    
    -- Current Balance Tracking
    current_balance_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (current_balance_usd >= 0),
    lifetime_earnings_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (lifetime_earnings_usd >= 0),
    
    -- Progress Tracking
    progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_balance_usd > 0 
            THEN LEAST(ROUND((current_balance_usd / target_balance_usd) * 100, 2), 100.00)
            ELSE 0.00 
        END
    ) STORED,
    
    -- Notification Settings
    notify_on_milestone BOOLEAN DEFAULT true, -- Notify on percentage milestones
    milestone_intervals INTEGER DEFAULT 25 CHECK (milestone_intervals > 0 AND milestone_intervals <= 50), -- e.g., 25% intervals
    notify_near_target BOOLEAN DEFAULT true, -- Notify when close to target
    target_proximity_percentage DECIMAL(5,2) DEFAULT 5.00 CHECK (target_proximity_percentage >= 0 AND target_proximity_percentage <= 20),
    
    -- Display Preferences
    currency_symbol VARCHAR(5) DEFAULT '$',
    show_cents BOOLEAN DEFAULT true, -- Whether to display cents in UI
    show_progress_bar BOOLEAN DEFAULT true,
    show_percentage BOOLEAN DEFAULT true,
    
    -- Reset/Cycle Settings
    auto_reset_on_target BOOLEAN DEFAULT false, -- Automatically reset balance when target is reached
    reset_frequency VARCHAR(20) CHECK (reset_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'none',
    last_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Historical Tracking
    targets_achieved INTEGER DEFAULT 0, -- Number of times target has been reached
    best_streak_days INTEGER DEFAULT 0, -- Longest streak of daily earnings
    current_streak_days INTEGER DEFAULT 0, -- Current streak of daily earnings
    last_earning_date DATE, -- Last date earnings were recorded
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional constraints
    CONSTRAINT valid_progress_settings CHECK (
        (notify_on_milestone = false) OR 
        (milestone_intervals > 0 AND milestone_intervals <= 50)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mbb_settings_user_id ON mbb_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mbb_settings_target_deadline ON mbb_settings(target_deadline) WHERE target_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mbb_settings_last_earning ON mbb_settings(last_earning_date);

-- Enable Row Level Security
ALTER TABLE mbb_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own MBB settings" ON mbb_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MBB settings" ON mbb_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MBB settings" ON mbb_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MBB settings" ON mbb_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mbb_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mbb_settings_updated_at
    BEFORE UPDATE ON mbb_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_mbb_settings_updated_at();

-- Function to initialize MBB settings for a new user
CREATE OR REPLACE FUNCTION initialize_mbb_settings(
    p_user_id UUID DEFAULT NULL,
    p_target_balance DECIMAL(12,2) DEFAULT 1000.00
)
RETURNS UUID AS $$
DECLARE
    settings_id UUID;
    target_user_id UUID;
BEGIN
    -- Use current user if no user_id provided
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    INSERT INTO mbb_settings (
        user_id,
        target_balance_usd,
        target_description
    ) VALUES (
        target_user_id,
        p_target_balance,
        'Initial MBB target - customize to match your goals!'
    ) 
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO settings_id;
    
    -- If no new record was created (conflict), get existing ID
    IF settings_id IS NULL THEN
        SELECT id INTO settings_id
        FROM mbb_settings
        WHERE user_id = target_user_id;
    END IF;
    
    RETURN settings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update MBB balance from time sessions
CREATE OR REPLACE FUNCTION update_mbb_balance_from_sessions()
RETURNS TRIGGER AS $$
DECLARE
    total_earnings DECIMAL(12,2);
    settings_record RECORD;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Calculate total earnings for the user
    SELECT 
        COALESCE(SUM(earnings_usd), 0) as total,
        COUNT(*) FILTER (WHERE DATE(ended_at) = today_date) as today_sessions
    INTO total_earnings
    FROM time_sessions 
    WHERE user_id = NEW.user_id 
    AND earnings_usd IS NOT NULL;
    
    -- Get current settings
    SELECT * INTO settings_record
    FROM mbb_settings 
    WHERE user_id = NEW.user_id;
    
    -- Initialize settings if they don't exist
    IF settings_record IS NULL THEN
        PERFORM initialize_mbb_settings(NEW.user_id);
        SELECT * INTO settings_record FROM mbb_settings WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update streak tracking
    DECLARE
        new_current_streak INTEGER := settings_record.current_streak_days;
        new_best_streak INTEGER := settings_record.best_streak_days;
    BEGIN
        -- Update streak if earning today
        IF NEW.earnings_usd > 0 THEN
            IF settings_record.last_earning_date = today_date - INTERVAL '1 day' THEN
                -- Continue streak
                new_current_streak := settings_record.current_streak_days + 1;
            ELSIF settings_record.last_earning_date < today_date - INTERVAL '1 day' OR settings_record.last_earning_date IS NULL THEN
                -- Start new streak
                new_current_streak := 1;
            END IF;
            
            -- Update best streak if current is better
            new_best_streak := GREATEST(new_best_streak, new_current_streak);
        END IF;
        
        -- Update MBB settings
        UPDATE mbb_settings SET
            current_balance_usd = total_earnings,
            lifetime_earnings_usd = GREATEST(lifetime_earnings_usd, total_earnings),
            last_earning_date = CASE WHEN NEW.earnings_usd > 0 THEN today_date ELSE last_earning_date END,
            current_streak_days = new_current_streak,
            best_streak_days = new_best_streak,
            targets_achieved = CASE 
                WHEN total_earnings >= target_balance_usd AND settings_record.current_balance_usd < target_balance_usd 
                THEN targets_achieved + 1 
                ELSE targets_achieved 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update MBB balance when time sessions are completed
CREATE TRIGGER trigger_update_mbb_balance_on_session_end
    AFTER INSERT OR UPDATE ON time_sessions
    FOR EACH ROW
    WHEN (NEW.ended_at IS NOT NULL AND NEW.earnings_usd IS NOT NULL)
    EXECUTE FUNCTION update_mbb_balance_from_sessions();

-- Function to get MBB progress summary
CREATE OR REPLACE FUNCTION get_mbb_progress_summary(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    current_balance DECIMAL(12,2),
    target_balance DECIMAL(12,2),
    progress_percentage DECIMAL(5,2),
    remaining_amount DECIMAL(12,2),
    targets_achieved INTEGER,
    current_streak INTEGER,
    best_streak INTEGER,
    days_to_deadline INTEGER
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Ensure settings exist
    PERFORM initialize_mbb_settings(target_user_id);
    
    RETURN QUERY
    SELECT 
        ms.current_balance_usd,
        ms.target_balance_usd,
        ms.progress_percentage,
        GREATEST(ms.target_balance_usd - ms.current_balance_usd, 0.00) as remaining_amount,
        ms.targets_achieved,
        ms.current_streak_days,
        ms.best_streak_days,
        CASE 
            WHEN ms.target_deadline IS NOT NULL 
            THEN (ms.target_deadline - CURRENT_DATE)::INTEGER
            ELSE NULL 
        END as days_to_deadline
    FROM mbb_settings ms
    WHERE ms.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE mbb_settings IS 'Stores Mental Bank Balance settings, targets, and progress tracking for users';
COMMENT ON COLUMN mbb_settings.target_balance_usd IS 'User-defined target amount to achieve';
COMMENT ON COLUMN mbb_settings.current_balance_usd IS 'Current accumulated balance from time sessions';
COMMENT ON COLUMN mbb_settings.progress_percentage IS 'Automatically calculated progress toward target (0-100%)';
COMMENT ON COLUMN mbb_settings.targets_achieved IS 'Number of times user has reached their target balance';
COMMENT ON COLUMN mbb_settings.current_streak_days IS 'Current consecutive days with earnings';
COMMENT ON COLUMN mbb_settings.best_streak_days IS 'Longest streak of consecutive earning days'; 