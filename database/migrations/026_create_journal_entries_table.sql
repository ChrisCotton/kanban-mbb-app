-- Migration 026: Create journal_entries table
-- Stores audio journal entries with transcriptions

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Entry metadata
    title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audio storage
    audio_file_path TEXT,
    audio_duration INTEGER, -- duration in seconds
    audio_file_size INTEGER, -- file size in bytes
    
    -- Transcription
    transcription TEXT,
    transcription_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    transcription_provider VARCHAR(50), -- which AI provider was used
    
    -- AI Insight Selection (checkboxes)
    use_audio_for_insights BOOLEAN DEFAULT true,
    use_transcript_for_insights BOOLEAN DEFAULT true,
    
    -- Sentiment/Analysis (for future)
    sentiment_score DECIMAL(3,2),
    sentiment_label VARCHAR(20),
    
    -- Tags/Categories
    tags TEXT[] DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own journal entries" ON journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entries_updated_at();
