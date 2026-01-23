# Create Vision Board Storage Bucket

## Issue
The application is trying to upload files to a Supabase storage bucket that doesn't exist.

## Solution

### Step 1: Create the Storage Bucket

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd
2. Navigate to **Storage** in the left sidebar
3. Click **"New Bucket"** button
4. Configure the bucket:
   - **Name**: `vision-board` (exactly as shown, with hyphen)
   - **Public bucket**: ✅ **Yes** (check this box - it's important!)
   - **File size limit**: Leave default or set as needed
   - **Allowed MIME types**: Leave empty (allows all types)
5. Click **"Create bucket"**

### Step 2: Set Storage Policies (Required)

After creating the bucket, you need to set up Row Level Security policies:

1. Click on the `vision-board` bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Allow authenticated users to upload files
- **Policy name**: `Allow authenticated users to upload`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(uid() = auth.uid())
```

#### Policy 2: Allow authenticated users to view files
- **Policy name**: `Allow authenticated users to view`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
(uid() = auth.uid())
```

#### Policy 3: Allow authenticated users to delete their own files
- **Policy name**: `Allow authenticated users to delete`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(uid() = auth.uid())
```

### Step 3: Verify

After creating the bucket and policies:

1. Refresh your vision board page
2. Try uploading an image or video
3. The upload should now work!

## Troubleshooting

### "Bucket not found" error persists
- Double-check the bucket name is exactly `vision-board` (with hyphen, lowercase)
- Verify the bucket is set to **Public**
- Check that policies are created correctly

### "Permission denied" error
- Make sure you're logged in
- Verify the storage policies are set up correctly
- Check that the bucket is public

### Still having issues?
Check the browser console for the exact error message and bucket name being used.
