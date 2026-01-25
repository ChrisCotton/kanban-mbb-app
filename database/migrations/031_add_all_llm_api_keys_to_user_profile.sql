-- Migration 031: Add API key fields for all LLM providers
-- Date: 2026-01-25
-- Adds API keys for all audio transcription and journal insight LLM providers

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS google_speech_api_key TEXT,
ADD COLUMN IF NOT EXISTS assemblyai_api_key TEXT,
ADD COLUMN IF NOT EXISTS deepgram_api_key TEXT,
ADD COLUMN IF NOT EXISTS anthropic_claude_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_gemini_api_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profile.google_speech_api_key IS 'User-specific Google Cloud Speech-to-Text API key';
COMMENT ON COLUMN user_profile.assemblyai_api_key IS 'User-specific AssemblyAI API key for transcription';
COMMENT ON COLUMN user_profile.deepgram_api_key IS 'User-specific Deepgram API key for real-time transcription';
COMMENT ON COLUMN user_profile.anthropic_claude_api_key IS 'User-specific Anthropic Claude API key for journal insights';
COMMENT ON COLUMN user_profile.google_gemini_api_key IS 'User-specific Google Gemini API key for journal insights';

-- Note: openai_api_key already exists from migration 030
-- Note: API keys are stored encrypted at the application level
-- Consider using Supabase Vault or encryption for production use
