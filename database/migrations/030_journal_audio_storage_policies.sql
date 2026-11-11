-- Let signed-in browsers upload and replace journal audio.
-- Direct uploads were failing when only an INSERT policy existed (upsert)
-- or when the original journal_audio policies had never been applied.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'journal_audio',
    'journal_audio',
    true,
    52428800,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "journal_audio_authenticated_insert" ON storage.objects;
CREATE POLICY "journal_audio_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'journal_audio');

DROP POLICY IF EXISTS "journal_audio_authenticated_update" ON storage.objects;
CREATE POLICY "journal_audio_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'journal_audio')
WITH CHECK (bucket_id = 'journal_audio');

DROP POLICY IF EXISTS "journal_audio_authenticated_select" ON storage.objects;
CREATE POLICY "journal_audio_authenticated_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'journal_audio');
