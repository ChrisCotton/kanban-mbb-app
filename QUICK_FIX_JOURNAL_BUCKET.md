# 🚨 QUICK FIX: Create Journal Audio Storage Bucket

## The Problem
The journal feature needs a storage bucket to store audio recordings, but it doesn't exist yet.

## The Solution

**Choose one method:**

### ✅ Option A: Run from CLI (Recommended - No Dashboard Login Required!)

**Method 1: Using Supabase CLI (Best Option)**

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref emxejsyyelcdpejxuvfd

# Push the migration
supabase db push
```

This will apply the migration from `supabase/migrations/20260124000001_create_journal_audio_bucket.sql` automatically.

**Method 2: Run SQL via Script (Shows SQL for Manual Execution)**

```bash
node scripts/run-storage-migration.js
```

This will display the SQL that you can copy-paste into Supabase Dashboard SQL Editor if CLI isn't available.

**Skip to Step 3: Verify** below after running either method.

---

### Option B: Manual Setup via Dashboard (2 minutes)

If you prefer the dashboard or CLI isn't available:

#### Step 1: Create the Bucket
1. Go to: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd/storage/buckets
2. Click **"New Bucket"**
3. Enter:
   - **Name**: `journal_audio` (exactly this, lowercase with underscore)
   - **Public bucket**: ✅ **CHECK THIS BOX** (allows signed URLs for playback)
4. Click **"Create bucket"**

#### Step 2: Set Up Policies (SQL Editor - Easiest!)

Go to **SQL Editor** → **New Query** → Paste this:

```sql
-- Create the storage bucket (idempotent)
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
```

Click **"Run"** to execute everything at once.

---

### Step 3: Verify
1. Go to `/journal` page in your app
2. Click "Record New Entry"
3. Record a short audio clip
4. Stop and save - it should upload successfully!

## Troubleshooting

### Migration Script Error: "Could not find the function public.exec_sql"
The `npm run migrate:single` script doesn't work for storage migrations because Supabase REST API doesn't support arbitrary SQL execution. Use **Option A (Supabase CLI)** or **Option B (Manual Dashboard)** instead.

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
