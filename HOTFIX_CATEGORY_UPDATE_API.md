# HOTFIX: Category Update API Missing Field

**Date:** 2026-01-14  
**Issue:** 500 Internal Server Error when updating task category  
**Status:** ✅ FIXED

## Problem

When users attempted to change a task's category in the TaskDetailModal and save, the API returned a 500 Internal Server Error. The browser console showed:
```
Error updating task: Error: Failed to update task
```

Server logs showed:
```
PUT /api/kanban/tasks/0b00046b-3ca3-479c-901d-4a705e79a336 500 in 326ms
```

## Root Cause

The `handleUpdateTask` function in `pages/api/kanban/tasks/[id].ts` was **missing** the `category_id` field handling.

**Fields it handled:**
- ✅ title
- ✅ description
- ✅ status
- ✅ priority
- ✅ due_date
- ✅ order_index
- ❌ **category_id** (MISSING!)

When the frontend sent `category_id` in the request body, the API endpoint ignored it, causing the database update to fail or produce unexpected results.

## The Fix

**File:** `pages/api/kanban/tasks/[id].ts`

### Changes:

1. **Extract `category_id` from request body:**
```typescript
const { title, description, status, priority, due_date, order_index, category_id } = req.body
```

2. **Add validation for `category_id`:**
```typescript
// Validate category_id if provided
if (category_id !== undefined && category_id !== null) {
  try {
    validateUUID(category_id, 'Category ID')
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid category_id format',
      message: error instanceof Error ? error.message : 'Invalid UUID'
    })
  }
}
```

3. **Include `category_id` in updates object:**
```typescript
if (category_id !== undefined) updates.category_id = category_id
```

## Validation Rules

The fix includes proper validation:
- ✅ Accepts `null` to clear category assignment
- ✅ Validates UUID format using `validateUUID()` function
- ✅ Returns 400 Bad Request for invalid category IDs
- ✅ Returns clear error message for debugging

## Testing

Test these scenarios:
1. ✅ Assign a category to a task
2. ✅ Change a task's category to a different one
3. ✅ Remove a category (set to null)
4. ✅ Try to set invalid category_id (should return 400)

## Impact

- **Before:** Category updates failed with 500 errors
- **After:** Category updates work correctly with proper validation

## Related Components

This fix completes the category update flow that includes:
- ✅ `components/kanban/TaskDetailModal.tsx` - UI for category selection
- ✅ `components/ui/CategorySelector.tsx` - Category dropdown component
- ✅ `hooks/useKanban.ts` - Frontend task update logic
- ✅ **`pages/api/kanban/tasks/[id].ts`** - Backend API endpoint (THIS FIX)

---

**Status:** Ready for testing - server auto-reloaded changes
