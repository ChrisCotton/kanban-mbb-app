# HOTFIX: Hourly Rate Not Displaying

**Date:** 2026-01-14  
**Issue:** MBB DEVELOPMENT category showing $0/hr instead of $200/hr

---

## 🐛 Problem

Category "MBB DEVELOPMENT" was visible after auth fix, but hourly rate showed $0 instead of $200.

**API Response:**
```json
{
  "hourly_rate": 0,        // ❌ UI was reading this
  "hourly_rate_usd": 200   // ✅ Correct value here
}
```

---

## 🔍 Root Cause

**Column Naming Inconsistency (Again!)**

- Database column: `hourly_rate_usd` ✓ (standardized in migration 013)
- API stores in: `hourly_rate_usd` ✓
- Some UI components read: `hourly_rate` ❌

---

## ✅ Fix Applied

Updated all UI components to use `hourly_rate_usd` with fallback:

### Fixed Components:

1. **`components/ui/CategoryList.tsx`**
   ```typescript
   // Before: category.hourly_rate
   // After:  category.hourly_rate_usd || category.hourly_rate || 0
   ```

2. **`components/ui/CategoryManager.tsx`**
   ```typescript
   hourly_rate_usd: (category.hourly_rate_usd || category.hourly_rate || 0).toString()
   ```

3. **`components/timer/MBBTimerSection.tsx`**
   ```typescript
   activeTask.category.hourly_rate_usd || activeTask.category.hourly_rate
   ```

4. **`components/kanban/TaskCard.tsx`**
   ```typescript
   task.category.hourly_rate_usd || task.category.hourly_rate || 0
   ```

---

## 🎯 Testing

**After refresh, you should see:**
- ✅ MBB DEVELOPMENT visible
- ✅ **$200/hr displayed correctly**
- ✅ All other categories with correct rates

---

## 📚 Related Issues

This is the **same issue** we fixed before in:
- Task update API
- Time sessions
- Category selectors

**Standard:** Always use `hourly_rate_usd` as the primary field name across the entire codebase.

---

**Status:** ✅ FIXED - Ready for testing
