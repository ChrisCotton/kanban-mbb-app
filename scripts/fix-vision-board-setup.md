# Fix Vision Board Database and Storage Setup

## Issue
Two problems need to be fixed:
1. **Database table missing**: `vision_board_images` table doesn't exist
2. **Storage bucket missing**: `vision-board` bucket doesn't exist

## Solution

### Step 1: Create the Database Table

Run these migrations in order in the Supabase SQL Editor:

#### Migration 1: Create vision_board_images table
Go to: **Supabase Dashboard → SQL Editor → New Query**

Copy and paste the entire contents of: `database/migrations/010_create_vision_board_images_table.sql`

#### Migration 2: Add goal and due_date columns  
After migration 1 completes successfully, run:
Copy and paste the entire contents of: `database/migrations/027_add_goal_and_due_date_to_vision_board.sql`

### Step 2: Create the Storage Bucket

Go to: **Supabase Dashboard → Storage → New Bucket**

Create a bucket with these settings:
- **Name**: `vision-board`
- **Public**: ✅ Yes (checked)
- **File size limit**: Leave default or set as needed
- **Allowed MIME types**: Leave empty (allows all types)

### Step 3: Set Storage Policies (Optional but Recommended)

After creating the bucket, go to **Storage → vision-board → Policies** and ensure users can:
- **Upload files**: Policy for INSERT
- **View files**: Policy for SELECT  
- **Delete their own files**: Policy for DELETE

The RLS policies should allow authenticated users to manage their own files.

## Quick Copy-Paste SQL

### Migration 010 (Create Table)
See: `database/migrations/010_create_vision_board_images_table.sql`

### Migration 027 (Add Columns)
See: `database/migrations/027_add_goal_and_due_date_to_vision_board.sql`

## Verification

After completing both steps, verify:

1. **Table exists**: 
   ```sql
   SELECT * FROM vision_board_images LIMIT 1;
   ```

2. **Bucket exists**:
   - Check Storage → vision-board bucket is visible
   - Try uploading a test file

3. **Test the app**:
   - Refresh the vision board page
   - Try uploading an image/video
   - Should no longer see "Bucket not found" or "relation does not exist" errors
