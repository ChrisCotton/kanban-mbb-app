# 🚨 QUICK FIX: Create Journal Audio Storage Bucket

## The Problem
The journal feature needs a storage bucket to store audio recordings, but it doesn't exist yet.

## The Solution (2 minutes)

### Step 1: Create the Bucket
1. Go to: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd/storage/buckets
2. Click **"New Bucket"**
3. Enter:
   - **Name**: `journal_audio` (exactly this, lowercase with underscore)
   - **Public bucket**: ✅ **CHECK THIS BOX** (allows signed URLs for playback)
4. Click **"Create bucket"**

### Step 2: Set Up Policies (SQL Editor - Easiest!)

Go to **SQL Editor** → **New Query** → Paste this:

```sql
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
```

Click **"Run"** to execute all three policies at once.

### Step 3: Verify
1. Go to `/journal` page in your app
2. Click "Record New Entry"
3. Record a short audio clip
4. Stop and save - it should upload successfully!

## Troubleshooting

### "Bucket not found" error
- Double-check the bucket name is exactly `journal_audio` (with underscore, lowercase)
- Verify the bucket is set to **Public**
- Make sure you clicked "Create bucket" successfully

### "Permission denied" error
- Make sure you're logged in
- Verify the storage policies were created correctly
- Check that the bucket is public

### Still having issues?
Check the browser console and network tab for specific error messages.
