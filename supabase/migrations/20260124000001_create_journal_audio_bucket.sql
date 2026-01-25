-- Migration: Create journal_audio storage bucket and policies
-- Date: 2026-01-24
-- Creates the storage bucket for journal audio recordings and sets up RLS policies

-- Create the storage bucket (idempotent - will not error if bucket already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'journal_audio',
    'journal_audio',
    true,
    52428800, -- 50MB limit
    NULL -- Allow all MIME types
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Allow authenticated users to upload audio files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'journal_audio');

-- Allow authenticated users to view audio files
CREATE POLICY "Allow authenticated view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'journal_audio');

-- Allow authenticated users to delete their own audio files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'journal_audio');
