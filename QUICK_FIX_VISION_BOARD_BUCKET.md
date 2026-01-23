# 🚨 QUICK FIX: Create Vision Board Storage Bucket

## The Problem
Your app is trying to upload files but the storage bucket doesn't exist.

## The Solution (2 minutes)

### Step 1: Create the Bucket
1. Go to: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd/storage/buckets
2. Click **"New Bucket"**
3. Enter:
   - **Name**: `vision-board` (exactly this, lowercase with hyphen)
   - **Public bucket**: ✅ **CHECK THIS BOX** (very important!)
4. Click **"Create bucket"**

### Step 2: Set Up Policies (Create One at a Time)

You need to create **3 separate policies**. Create them one at a time:

#### Policy 1: Allow Uploads
1. Click on the `vision-board` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"** → **"For full customization"**
4. **Policy name**: `Allow authenticated uploads`
5. Check **INSERT** operation
6. In the SQL editor, paste:
```sql
bucket_id = 'vision-board'
```
7. Click **"Review"** → **"Save policy"**

#### Policy 2: Allow Viewing
1. Click **"New Policy"** again
2. **Policy name**: `Allow authenticated view`
3. Check **SELECT** operation
4. In the SQL editor, paste:
```sql
bucket_id = 'vision-board'
```
5. Click **"Review"** → **"Save policy"**

#### Policy 3: Allow Deletion
1. Click **"New Policy"** again
2. **Policy name**: `Allow authenticated delete`
3. Check **DELETE** operation
4. In the SQL editor, paste:
```sql
bucket_id = 'vision-board'
```
5. Click **"Review"** → **"Save policy"**

**OR use SQL Editor (Easier!):**

Go to **SQL Editor** → **New Query** → Paste this:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vision-board');

-- Allow authenticated users to view
CREATE POLICY "Allow authenticated view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vision-board');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vision-board');
```

Click **Run** - this creates all 3 policies at once!

### Step 3: Test
1. Refresh your vision board page
2. Try uploading an image/video
3. ✅ Should work now!

## That's it! 🎉

The bucket name must be exactly `vision-board` (lowercase, with hyphen) to match your code.
