# Next Steps: Earnings Fix Verification

## ✅ Migrations Applied Successfully

The following migrations have been applied:
- ✅ `20260130000000_fix_earnings_calculation_and_backfill.sql` - Updated trigger
- ✅ `20260130000002_convert_earnings_to_regular_column.sql` - Converted column & backfilled
- ✅ `20260130000001_fix_start_time_session_category_lookup.sql` - Fixed category lookup

## 🔍 Step 1: Verify Database State

Run the verification script to check if earnings were backfilled:

```bash
npm run verify:earnings
```

This will show:
- Total completed sessions
- How many now have earnings
- Sample of backfilled data
- Any sessions still missing earnings (and why)

**Expected Result:** Most completed sessions should now have earnings calculated.

**OR** use the quick manual test: See `MANUAL_TEST_EARNINGS_FIX.md` for step-by-step instructions.

## 🧪 Step 2: Test the MBB Dashboard

1. **Open the MBB Dashboard** (`/mbb` page)
2. **Check "Recent Time Sessions" section:**
   - ✅ Completed sessions should now show earnings (not $0.00)
   - ✅ Historical data should be preserved
   - ✅ Live timers should continue working

3. **Verify specific sessions:**
   - Look for sessions that previously showed $0.00
   - They should now show correct earnings based on duration × hourly rate

## 🎯 Step 3: Test New Sessions

Test that future sessions calculate earnings correctly:

1. **Start a timer** on a task with a category that has an hourly rate
2. **Let it run for a few minutes**
3. **Stop the timer**
4. **Check the session:**
   - Should appear in "Recent Time Sessions" with correct earnings
   - Earnings should be calculated immediately (duration × rate)

## 🧪 Step 4: Run Regression Tests

Ensure nothing broke:

```bash
# Run full regression suite
npm run test:regression:jest

# Or run specific time session tests
jest __tests__/api/time-sessions/
```

**What to check:**
- ✅ Time session creation still works
- ✅ Earnings calculation works for new sessions
- ✅ Category lookup works when starting sessions
- ✅ No regressions in other features

## 📊 Step 5: Verify Analytics

Check that analytics now use historical data:

1. **Check MBB Dashboard analytics:**
   - "Today" earnings should include historical sessions
   - "This Week" and "This Month" should be accurate
   - "Average Rate" should reflect all sessions

2. **Verify totals:**
   - Current Balance should include backfilled earnings
   - Progress toward target should be accurate

## 🐛 If Issues Found

### If sessions still show $0.00:

1. **Check verification script output** - it will show why sessions don't have earnings
2. **Common reasons:**
   - Session has no hourly_rate_usd AND no category_id
   - Session has zero duration (ended_at = started_at)
   - Category doesn't have hourly_rate_usd set

3. **Fix missing data:**
   - Ensure categories have hourly_rate_usd set
   - Check that tasks are linked to categories
   - Verify sessions have valid start/end times

### If trigger isn't working:

1. **Check trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_time_sessions_updated_at';
   ```

2. **Test trigger manually:**
   ```sql
   -- Update a test session to trigger earnings calculation
   UPDATE time_sessions 
   SET ended_at = CURRENT_TIMESTAMP 
   WHERE id = 'some-session-id' AND is_active = true;
   ```

## ✅ Success Criteria

The fix is successful when:

- ✅ Most completed sessions (>80%) have earnings backfilled
- ✅ MBB Dashboard shows historical earnings (not $0.00)
- ✅ New sessions calculate earnings correctly
- ✅ All regression tests pass
- ✅ Analytics reflect accurate historical data

## 📝 Notes

- Some sessions may legitimately have NULL earnings if:
  - They have no hourly rate and no category
  - They have zero duration
  - The category doesn't have an hourly rate set

- The trigger now looks up category rates if session rate is NULL
- Future sessions will automatically calculate earnings when stopped
