-- Fix Category Ownership
-- Updates all categories to be owned by the current authenticated user
-- Run this in Supabase SQL Editor

-- STEP 1: First, let's see what user IDs we have
-- Run this to understand your data:
SELECT DISTINCT created_by FROM categories ORDER BY created_by;

-- STEP 2: Get your current auth user ID
-- Run this in your browser console while logged in:
-- supabase.auth.getUser().then(({data}) => console.log('Your user ID:', data.user.id))

-- STEP 3: Update categories to be owned by your current user
-- REPLACE 'YOUR_USER_ID_HERE' with the ID from step 2
UPDATE categories
SET created_by = 'YOUR_USER_ID_HERE',
    updated_by = 'YOUR_USER_ID_HERE',
    updated_at = NOW()
WHERE created_by != 'YOUR_USER_ID_HERE';

-- STEP 4: Verify the fix
SELECT id, name, created_by FROM categories;
