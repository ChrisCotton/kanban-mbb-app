# Time Session Earnings Fix - January 30, 2026

## Problem

Completed time sessions were showing `$0.00` balances in the "Recent Time Sessions" section of the MBB Dashboard. Historical time tracking data was not being preserved, making analytics unreliable.

## Root Cause

1. **NULL hourly_rate_usd**: When sessions were started, the `start_time_session` function was checking `created_by = user_id` when looking up category hourly rates. This check could fail, resulting in `hourly_rate_usd` being NULL.

2. **Trigger dependency**: The earnings calculation trigger (`update_time_sessions_updated_at`) only calculates earnings if `hourly_rate_usd` is NOT NULL. If it's NULL, earnings remain NULL even for completed sessions.

3. **No fallback**: The trigger didn't attempt to look up the category's hourly rate if the session's `hourly_rate_usd` was NULL.

## Solution

### Migration 1: Fix Trigger and Backfill (`20260130000000_fix_earnings_calculation_and_backfill.sql`)

1. **Enhanced Trigger**: Updated `update_time_sessions_updated_at()` to:
   - Look up category `hourly_rate_usd` if session's `hourly_rate_usd` is NULL
   - Calculate earnings using the category rate if available
   - Backfill `hourly_rate_usd` on the session if it was NULL

2. **Backfill Existing Data**: Updates all completed sessions with NULL earnings:
   - Calculates earnings from `hourly_rate_usd` if available
   - Falls back to category `hourly_rate_usd` if session rate is NULL
   - Only processes sessions with valid duration (`ended_at - started_at > 0`)

### Migration 2: Fix Category Lookup (`20260130000001_fix_start_time_session_category_lookup.sql`)

1. **Removed created_by check**: The `start_time_session` function no longer checks `created_by = user_id` when looking up category rates. RLS policies handle access control.

2. **Better NULL handling**: Only uses category rate if it's not NULL.

## Files Changed

- `supabase/migrations/20260130000000_fix_earnings_calculation_and_backfill.sql` (NEW - updates trigger)
- `supabase/migrations/20260130000002_convert_earnings_to_regular_column.sql` (NEW - converts column type and backfills)
- `supabase/migrations/20260130000001_fix_start_time_session_category_lookup.sql` (NEW - fixes category lookup)
- `scripts/fix-time-session-earnings.js` (NEW - verification script)

## How to Apply the Fix

### Step 1: Run Migrations

**IMPORTANT:** Run migrations in this exact order:

1. Open Supabase Dashboard → SQL Editor
2. Run migration `20260130000000_fix_earnings_calculation_and_backfill.sql`:
   - Copy the entire contents of the file
   - Paste into SQL Editor
   - Click "Run"
   - This updates the trigger function
3. Run migration `20260130000002_convert_earnings_to_regular_column.sql`:
   - Copy the entire contents of the file
   - Paste into SQL Editor
   - Click "Run"
   - This converts earnings_usd from GENERATED to regular column and backfills data
4. Run migration `20260130000001_fix_start_time_session_category_lookup.sql`:
   - Copy the entire contents of the file
   - Paste into SQL Editor
   - Click "Run"
   - This fixes category lookup in start_time_session function

### Step 2: Verify the Fix

After running the migrations, check the MBB Dashboard:

1. **Recent Time Sessions** should now show earnings for completed sessions
2. **Historical data** should be preserved with correct balances
3. **Live timers** continue to work as before

### Step 3: Verify Database State (Optional)

Run this query in Supabase SQL Editor to check for any remaining NULL earnings:

```sql
SELECT 
  COUNT(*) as total_completed,
  COUNT(earnings_usd) as with_earnings,
  COUNT(*) - COUNT(earnings_usd) as missing_earnings
FROM time_sessions
WHERE ended_at IS NOT NULL 
  AND is_active = false
  AND EXTRACT(EPOCH FROM (ended_at - started_at)) > 0;
```

Expected result: `missing_earnings` should be 0 (or very low if some sessions legitimately have no hourly rate).

## Testing

After applying the fix:

1. **Start a new timer** - should capture hourly_rate_usd correctly
2. **Stop the timer** - earnings should be calculated immediately
3. **Check Recent Time Sessions** - completed sessions should show correct balances
4. **Verify historical data** - old sessions should now have earnings backfilled

## Impact

- ✅ Historical time tracking data is now preserved
- ✅ Analytics can rely on accurate earnings data
- ✅ Future sessions will correctly calculate earnings even if hourly_rate wasn't captured at start
- ✅ Backfill ensures existing data is corrected

## Notes

- The backfill migration only processes sessions with valid duration (ended_at > started_at)
- Sessions without a category or hourly rate will still have NULL earnings (this is expected)
- The trigger now handles both cases: sessions with hourly_rate_usd and sessions that need to look it up from category
