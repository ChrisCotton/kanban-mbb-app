-- Migration: Add OpenAI API key field to user_profile table
-- Date: 2026-01-25
-- Stores user-specific OpenAI API key for Whisper transcription and GPT-4 journal insights

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profile.openai_api_key IS 'User-specific OpenAI API key for Whisper transcription and GPT-4 journal insights';

-- Note: API keys are stored encrypted at the application level
-- Consider using Supabase Vault or encryption for production use
