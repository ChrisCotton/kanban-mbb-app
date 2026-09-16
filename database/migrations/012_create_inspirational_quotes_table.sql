-- Migration 012: Create inspirational_quotes table
-- User-managed quotes displayed in the compact strip below the vision board carousel

CREATE TABLE IF NOT EXISTS inspirational_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inspirational_quotes_text_not_empty CHECK (char_length(trim(text)) > 0),
    CONSTRAINT inspirational_quotes_text_max_length CHECK (char_length(text) <= 500),
    CONSTRAINT inspirational_quotes_author_max_length CHECK (author IS NULL OR char_length(author) <= 200),
    CONSTRAINT inspirational_quotes_valid_display_order CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inspirational_quotes_user_id ON inspirational_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirational_quotes_active ON inspirational_quotes(user_id, is_active, display_order)
    WHERE is_active = true;

ALTER TABLE inspirational_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inspirational quotes" ON inspirational_quotes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inspirational quotes" ON inspirational_quotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inspirational quotes" ON inspirational_quotes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inspirational quotes" ON inspirational_quotes
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_inspirational_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspirational_quotes_updated_at
    BEFORE UPDATE ON inspirational_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_inspirational_quotes_updated_at();
