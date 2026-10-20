-- Create user_profile before later migrations alter it.
-- The table lived only in database/migrations/025_create_user_profile_table.sql,
-- so a fresh local Supabase stack failed on 20260125000000.

CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    display_name VARCHAR(100),
    avatar_url TEXT,

    default_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    default_target_revenue DECIMAL(12,2) DEFAULT 1000.00 CHECK (default_target_revenue >= 0),

    ai_image_provider VARCHAR(50) DEFAULT 'openai_dalle'
        CHECK (ai_image_provider IN ('openai_dalle', 'stability_ai', 'midjourney', 'nano_banana', 'veo_3')),

    ai_audio_journal_provider VARCHAR(50) DEFAULT 'openai_whisper'
        CHECK (ai_audio_journal_provider IN ('openai_whisper', 'google_speech', 'assemblyai', 'deepgram')),

    ai_journal_insight_provider VARCHAR(50) DEFAULT 'openai_gpt4'
        CHECK (ai_journal_insight_provider IN ('openai_gpt4', 'anthropic_claude', 'google_gemini', 'cognee_memory')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profile
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profile
    FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_updated_at();
