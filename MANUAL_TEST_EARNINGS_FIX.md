# Manual Test Script: Earnings Fix Verification

## Prerequisites
- ✅ Migrations have been applied successfully
- ✅ You have access to the MBB Dashboard (`/mbb` page)
- ✅ You have at least one completed time session in the database
- ✅ You have at least one category with an hourly rate set

## Test 1: Verify Historical Sessions Have Earnings

### Steps:
1. **Open MBB Dashboard**
   - Navigate to `/mbb` page
   - Look for the "Recent Time Sessions" section

2. **Check Completed Sessions**
   - Scroll through the list of time sessions
   - Look for sessions that are NOT marked as "LIVE"
   - These should be inactive/completed sessions

3. **Verify Earnings Display**
   - ✅ **PASS**: Completed sessions show earnings > $0.00 (e.g., "$150.00", "$75.50")
   - ❌ **FAIL**: Completed sessions show "$0.00" or no earnings

### Expected Result:
- All completed sessions should show earnings based on their duration × hourly rate
- Sessions should display both hours worked AND earnings amount

---

## Test 2: Verify New Session Calculates Earnings

### Steps:
1. **Start a New Timer**
   - Go to Kanban board (`/kanban`)
   - Click on a task that has a category with an hourly rate
   - Click "Start Timing" or use the timer controls

2. **Let Timer Run**
   - Let the timer run for at least 1-2 minutes
   - Note the task name and category

3. **Stop the Timer**
   - Click "Stop" or "End Session"
   - Wait for the session to be saved (check console for any errors)

4. **Check MBB Dashboard**
   - Navigate to `/mbb` page
   - Find the session you just stopped in "Recent Time Sessions"
   - It should appear at or near the top of the list

5. **Verify Earnings**
   - ✅ **PASS**: Session shows earnings calculated as: `(duration in hours) × (hourly rate)`
   - Example: 0.5 hours × $150/hr = $75.00
   - ❌ **FAIL**: Session shows "$0.00" or no earnings

### Expected Result:
- New sessions should immediately show earnings after being stopped
- Earnings should match: `hours × hourly_rate`

---

## Test 3: Verify Sessions Without Category Rate

### Steps:
1. **Find or Create a Task Without Category**
   - Go to Kanban board
   - Find a task with no category OR create a new task without selecting a category
   - Start a timer on this task
   - Let it run for a few minutes
   - Stop the timer

2. **Check MBB Dashboard**
   - Find this session in "Recent Time Sessions"
   - Check what earnings are displayed

### Expected Result:
- If task has no category OR category has no hourly rate:
  - Session may show "$0.00" (this is expected/acceptable)
- If task has a category WITH an hourly rate:
  - Session should show earnings > $0.00

---

## Test 4: Verify Analytics Accuracy

### Steps:
1. **Open MBB Dashboard**
   - Navigate to `/mbb` page
   - Look at the summary cards at the top:
     - "Today: $X.XX"
     - "This Week: $X.XX"
     - "This Month: $X.XX"
     - "Average Rate: $X.XX/hr"

2. **Check Current Balance**
   - Look at "Current Balance" display
   - This should include earnings from ALL completed sessions (historical + new)

3. **Manual Calculation Check** (Optional)
   - Count sessions from today
   - Add up their earnings manually
   - Compare with "Today" card
   - ✅ **PASS**: Numbers match (or are very close)
   - ❌ **FAIL**: Numbers don't match

### Expected Result:
- Analytics should reflect ALL historical earnings, not just live timers
- Current Balance should include backfilled historical data

---

## Test 5: Verify Category Rate Lookup

### Steps:
1. **Check a Session's Category**
   - In MBB Dashboard, find a completed session
   - Note which category it belongs to
   - Go to Categories page (`/categories`)
   - Find that category and note its hourly rate

2. **Calculate Expected Earnings**
   - Session duration (from MBB Dashboard) × Category hourly rate
   - Example: 2.5 hours × $150/hr = $375.00

3. **Compare with Displayed Earnings**
   - ✅ **PASS**: Displayed earnings match calculation
   - ❌ **FAIL**: Displayed earnings don't match

### Expected Result:
- Sessions should use the category's hourly rate if session rate was NULL
- Earnings should be calculated correctly from category rate

---

## Quick Verification Checklist

Run through this checklist quickly:

- [ ] MBB Dashboard loads without errors
- [ ] "Recent Time Sessions" section displays
- [ ] Completed (non-LIVE) sessions show earnings > $0.00
- [ ] Can start a new timer
- [ ] Can stop a timer
- [ ] New stopped session shows earnings immediately
- [ ] "Today" earnings includes historical sessions
- [ ] "Current Balance" reflects historical data
- [ ] No console errors related to earnings calculation

---

## Troubleshooting

### If sessions still show $0.00:

1. **Check Database**
   - Run: `npm run verify:earnings`
   - This will show which sessions have NULL earnings and why

2. **Check Category Rates**
   - Go to Categories page
   - Ensure categories have `hourly_rate_usd` set
   - If not, set them and sessions should recalculate

3. **Check Session Duration**
   - Sessions with zero duration (started_at = ended_at) won't have earnings
   - This is expected behavior

4. **Check Console**
   - Open browser DevTools → Console
   - Look for errors related to:
     - `start_time_session`
     - `end_time_session`
     - Earnings calculation

### If new sessions don't calculate earnings:

1. **Verify Trigger is Working**
   - Check browser console for errors
   - Check that session has `ended_at` set (not NULL)
   - Check that session has `hourly_rate_usd` OR `category_id` set

2. **Check Category Link**
   - Ensure task has a category assigned
   - Ensure category has an hourly rate

---

## Success Criteria

✅ **Fix is successful if:**
- Historical sessions show earnings (not $0.00)
- New sessions calculate earnings immediately
- Analytics reflect all historical data
- No console errors related to earnings

❌ **Fix needs attention if:**
- Most completed sessions still show $0.00
- New sessions don't calculate earnings
- Analytics only show live timer data
- Console shows errors about earnings calculation

---

## Quick Test (5 minutes)

**Fastest way to verify:**

1. Open `/mbb` page
2. Look at "Recent Time Sessions"
3. Find a completed session (not LIVE)
4. ✅ **If it shows earnings > $0.00**: Fix is working!
5. ✅ **If it shows $0.00**: Check `npm run verify:earnings` for details

---

## Next Steps After Testing

If tests pass:
- ✅ Fix is working correctly
- ✅ Historical data is preserved
- ✅ Analytics are accurate

If tests fail:
- Run `npm run verify:earnings` for detailed diagnostics
- Check console for errors
- Verify migrations were applied correctly
- See `TIMER_EARNINGS_FIX_2026-01-30.md` for troubleshooting
