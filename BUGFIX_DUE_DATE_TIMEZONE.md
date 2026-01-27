# Bug Fix: Due Date Timezone Issues (Multiple)

## Issue 1: "Tomorrow" Shows Today's Date ✅ FIXED
## Issue 2: Selected Dates Display as Previous Day ✅ FIXED

## Problem Analysis

### Issue
When selecting "Tomorrow" from the due date dropdown in Task Details modal, the date remains as today (Tue, Jan 27, 2026) instead of updating to tomorrow (Wed, Jan 28, 2026).

### Root Cause

**Core Problem**: JavaScript's `new Date('YYYY-MM-DD')` interprets date strings as UTC midnight, which when converted to local timezones behind UTC (like PST/PDT) becomes the previous day.

**Example**:
- Input: `"2026-01-28"`
- `new Date("2026-01-28")` → UTC midnight Jan 28 → PST shows as Jan 27 ❌
- `new Date(2026, 0, 28)` → Local midnight Jan 28 → PST shows as Jan 28 ✅

**Issues Found**:

1. **DatePicker.tsx - UTC Conversion in Shortcuts**:
   - `getDateShortcuts()` calculates dates correctly in local time
   - But converts to UTC using `toISOString().split('T')[0]`
   - Causes "Tomorrow" to show today's date

2. **DatePicker.tsx - UTC Conversion in Display**:
   - `formatDisplayDate()` uses `new Date(dateString)` which interprets YYYY-MM-DD as UTC
   - Causes selected dates to display as previous day

3. **TaskDetailModal.tsx - UTC Conversion in Formatting**:
   - `formatDate()` uses `new Date(dateString)` which interprets YYYY-MM-DD as UTC
   - Causes due dates to display as previous day

### Code Locations
- **File**: `components/ui/DatePicker.tsx`
  - Lines 33-43: `formatDisplayDate()` function
  - Lines 87-108: `getDateShortcuts()` function
- **File**: `components/kanban/TaskDetailModal.tsx`
  - Lines 236-266: `formatDate()` function

---

## Proposed Solutions

### Solution 1: Fix Date Calculations to Use Local Timezone (RECOMMENDED)
**Priority**: High | **Effort**: Low | **Impact**: High

**Changes**:
- Replace UTC-based date calculations with local timezone
- Use local date formatting consistently
- Ensure "Tomorrow" calculates correctly regardless of timezone

**Implementation**:
```typescript
// Helper function to get local date string (YYYY-MM-DD)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get today's date in local timezone
const today = getLocalDateString(new Date())

// Get date shortcuts using local timezone
const getDateShortcuts = () => {
  const todayDate = new Date()
  const tomorrow = new Date(todayDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date(todayDate)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const nextMonth = new Date(todayDate)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  return [
    { label: 'Today', date: getLocalDateString(todayDate) },
    { label: 'Tomorrow', date: getLocalDateString(tomorrow) },
    { label: 'Next Week', date: getLocalDateString(nextWeek) },
    { label: 'Next Month', date: getLocalDateString(nextMonth) }
  ]
}
```

**Pros**:
- ✅ Fixes the immediate bug
- ✅ Low risk, minimal changes
- ✅ Works correctly for all users regardless of timezone
- ✅ No database changes needed
- ✅ No user configuration required

**Cons**:
- ⚠️ Dates stored in database may still be interpreted as UTC by backend (if backend expects UTC)
- ⚠️ Doesn't solve timezone issues for users traveling across timezones

---

### Solution 2: Add Timezone Support to User Profile
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Changes**:
- Add `timezone` field to `user_profile` table
- Store user's timezone preference (e.g., "America/Los_Angeles")
- Use timezone-aware date calculations in DatePicker
- Add timezone selector in Profile Settings

**Implementation**:
1. **Database Migration**:
```sql
ALTER TABLE user_profile 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Los_Angeles';
```

2. **DatePicker Enhancement**:
```typescript
// Use user's timezone preference
const userTimezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
const today = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone })
```

**Pros**:
- ✅ Handles timezone edge cases properly
- ✅ Supports users traveling across timezones
- ✅ More robust long-term solution
- ✅ Better for international users

**Cons**:
- ⚠️ Requires database migration
- ⚠️ Requires UI changes (timezone selector)
- ⚠️ More complex implementation
- ⚠️ May not be necessary if Solution 1 works

---

### Solution 3: Hybrid Approach (Solution 1 + Optional Timezone)
**Priority**: High | **Effort**: Low-Medium | **Impact**: High

**Changes**:
- Implement Solution 1 immediately (fix the bug)
- Add timezone field to profile (optional, defaults to browser timezone)
- Use timezone preference if available, fallback to browser timezone

**Pros**:
- ✅ Fixes bug immediately
- ✅ Provides foundation for future timezone features
- ✅ Backward compatible
- ✅ Progressive enhancement

**Cons**:
- ⚠️ Slightly more complex than Solution 1 alone

---

## Recommendation

### **Solution 1: Fix Date Calculations to Use Local Timezone**

**Justification**:
1. **Immediate Fix**: Solves the bug with minimal code changes
2. **Low Risk**: No database changes, no breaking changes
3. **User Experience**: Works correctly for 99% of use cases
4. **Time to Market**: Can be implemented and tested quickly

**Implementation Plan**:
1. Update `DatePicker.tsx` to use local timezone calculations
2. Replace all `toISOString().split('T')[0]` with local date formatting
3. Add unit tests to verify timezone handling
4. Test in different timezones (PST, EST, UTC, etc.)

**Future Enhancement**:
- If timezone issues persist or users request it, implement Solution 2 as a follow-up

---

## Testing Plan

### Test Cases:
1. ✅ Select "Tomorrow" when today is Tuesday Jan 27 → Should show Wednesday Jan 28
2. ✅ Select "Tomorrow" in PST timezone (UTC-8) → Should use local date
3. ✅ Select "Tomorrow" in EST timezone (UTC-5) → Should use local date
4. ✅ Select "Tomorrow" in UTC timezone → Should use local date
5. ✅ Date display matches date stored in database
6. ✅ "Today", "Next Week", "Next Month" shortcuts work correctly

### Edge Cases:
- Date selection near midnight (timezone boundary)
- Daylight Saving Time transitions
- Users traveling across timezones (future enhancement)

---

## Implementation Notes

### Key Changes Made:

1. **`components/ui/DatePicker.tsx`**:
   - ✅ Added `getLocalDateString()` helper function to format dates in local timezone
   - ✅ Updated `formatDisplayDate()` to parse YYYY-MM-DD as local dates (not UTC)
   - ✅ Updated `getDateShortcuts()` to use `getLocalDateString()` instead of `toISOString()`
   - ✅ Updated `formatInputDate()` to handle YYYY-MM-DD format correctly

2. **`components/kanban/TaskDetailModal.tsx`**:
   - ✅ Added `parseLocalDate()` helper function to parse YYYY-MM-DD as local dates
   - ✅ Updated `formatDate()` to use `parseLocalDate()` instead of `new Date(dateString)`

3. **Testing**:
   - ✅ Verified date parsing works correctly in different timezones
   - ✅ Test confirms: UTC parse shows previous day, Local parse shows correct day

4. **Backend Compatibility**:
   - ✅ Backend API accepts dates in YYYY-MM-DD format (no changes needed)
   - ✅ Dates are stored as date-only strings, not timestamps

### Fix Summary:
- **Issue 1 (Tomorrow)**: Fixed by using `getLocalDateString()` in shortcuts
- **Issue 2 (Previous Day)**: Fixed by parsing YYYY-MM-DD dates as local dates in multiple components

### Additional Fixes:
- ✅ Created shared `lib/utils/date-helpers.ts` utility with `parseLocalDate()` function
- ✅ Updated `TaskCard.tsx` to use `parseLocalDate()` for date formatting and overdue checks
- ✅ Updated `ThumbnailGallery.tsx` to use `parseLocalDate()` for date comparisons
- ✅ Updated `VisionBoardGalleryModal.tsx` to use `parseLocalDate()` for date display
- ✅ Updated `CalendarView.tsx` to use `parseLocalDate()` for date comparisons and display

---

## Related Files
- `components/ui/DatePicker.tsx` - Main component to fix
- `components/ui/DatePicker.test.tsx` - Tests to update
- `components/kanban/TaskDetailModal.tsx` - Uses DatePicker
- `components/kanban/TaskModal.tsx` - Uses DatePicker
- `components/vision-board/ImageUploader.tsx` - Uses DatePicker
- `components/vision-board/AIGenerator.tsx` - Uses DatePicker
