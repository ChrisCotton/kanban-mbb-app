-- Migration: Add Nano Banana and Google AI API key fields to user_profile table
-- Date: 2026-01-28
-- Stores user-specific API keys for image generation providers

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS nano_banana_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_ai_api_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profile.nano_banana_api_key IS 'User-specific Nano Banana API key for image generation';
COMMENT ON COLUMN user_profile.google_ai_api_key IS 'User-specific Google AI API key for Veo 3 / Imagen 3';

-- Note: API keys are stored encrypted at the application level
-- Consider using Supabase Vault or encryption for production use
