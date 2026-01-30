# CHUNK 4B: Progress Calculation Engine - Manual Testing Guide

## Overview
This guide helps you manually test the progress calculation engine for goals with different progress types: Manual, Task-based, and Milestone-based.

## Prerequisites
- User account logged in
- At least one goal created
- Access to Kanban board (for task-based testing)
- Access to Goals page (for milestone-based testing)

---

## Test 1: Manual Progress Type

### Steps:
1. Go to `/goals` page
2. Click "+ NEW GOAL" button
3. Fill in:
   - **Title**: "Test Manual Goal"
   - **Progress Type**: Select "Manual"
   - **Target Date**: Any future date
4. Click "Create Goal"
5. Open the goal card to view details

### Expected Result:
- Goal shows progress value of **0%** initially
- You can manually set progress (if edit functionality exists)
- Progress value stays at whatever you set it to

### Verification:
- Check goal card displays: "Progress 0%"
- Progress bar shows 0% filled

---

## Test 2: Task-Based Progress (Simple Counting)

### Steps:
1. Go to `/goals` page
2. Click "+ NEW GOAL" button
3. Fill in:
   - **Title**: "Test Task-Based Goal"
   - **Progress Type**: Select "Task-based"
   - **Target Date**: Any future date
4. Click "Create Goal"
5. Go to Kanban board (`/dashboard`)
6. Create 4 tasks:
   - Task 1: "Complete task 1"
   - Task 2: "Complete task 2"
   - Task 3: "Complete task 3"
   - Task 4: "Complete task 4"
7. Link all 4 tasks to your "Test Task-Based Goal"
   - Click on each task → Link to Goal → Select "Test Task-Based Goal"
8. Check goal progress (should be 0%)
9. Mark Task 1 as "Done" → Check goal progress (should be 25%)
10. Mark Task 2 as "Done" → Check goal progress (should be 50%)
11. Mark Task 3 as "Done" → Check goal progress (should be 75%)
12. Mark Task 4 as "Done" → Check goal progress (should be 100%)

### Expected Result:
- Progress updates automatically as tasks are completed
- Progress = (completed tasks / total tasks) × 100
- Progress rounds to nearest integer (e.g., 33.33% → 33%)

### Verification Points:
- ✅ Progress updates immediately when task status changes
- ✅ Progress calculation is correct (1/4 = 25%, 2/4 = 50%, etc.)
- ✅ Progress rounds correctly

---

## Test 3: Task-Based Progress (Weighted)

### Steps:
1. Create a new goal with "Task-based" progress type
2. Create 3 tasks:
   - Task A: "Important task" (weight: 5)
   - Task B: "Medium task" (weight: 3)
   - Task C: "Small task" (weight: 2)
3. Link all tasks to the goal with their weights
4. Check initial progress (should be 0%)
5. Mark Task A as "Done" → Progress should be 50% (5/10 total weight)
6. Mark Task C as "Done" → Progress should be 70% (5+2 = 7/10 total weight)
7. Mark Task B as "Done" → Progress should be 100% (all completed)

### Expected Result:
- Progress = (sum of completed task weights / sum of all task weights) × 100
- Task A (weight 5) contributes 50% of total weight
- Task C (weight 2) contributes 20% of total weight
- Task B (weight 3) contributes 30% of total weight

### Verification Points:
- ✅ Weighted calculation works correctly
- ✅ Progress updates when weighted tasks are completed
- ✅ Progress rounds correctly

---

## Test 4: Milestone-Based Progress

### Steps:
1. Go to `/goals` page
2. Click "+ NEW GOAL" button
3. Fill in:
   - **Title**: "Test Milestone Goal"
   - **Progress Type**: Select "Milestone-based"
   - **Target Date**: Any future date
4. Click "Create Goal"
5. Open the goal detail panel
6. Add 4 milestones:
   - Milestone 1: "Design phase"
   - Milestone 2: "Development phase"
   - Milestone 3: "Testing phase"
   - Milestone 4: "Launch phase"
7. Check initial progress (should be 0%)
8. Mark Milestone 1 as complete → Progress should be 25% (1/4)
9. Mark Milestone 2 as complete → Progress should be 50% (2/4)
10. Mark Milestone 3 as complete → Progress should be 75% (3/4)
11. Mark Milestone 4 as complete → Progress should be 100% (4/4)

### Expected Result:
- Progress = (completed milestones / total milestones) × 100
- Progress updates automatically when milestones are toggled
- Progress rounds to nearest integer

### Verification Points:
- ✅ Progress updates when milestone is marked complete
- ✅ Progress updates when milestone is marked incomplete (toggle back)
- ✅ Progress calculation is correct

---

## Test 5: Automatic Recalculation on Task Link/Unlink

### Steps:
1. Create a "Task-based" goal
2. Create 2 tasks and link them to the goal
3. Mark both tasks as "Done"
4. Check goal progress (should be 100%)
5. Unlink one task from the goal
6. Check goal progress (should be 100% - 1 task remaining, both done)
7. Actually, if you unlink a completed task, progress should recalculate
8. Link a new incomplete task to the goal
9. Check goal progress (should be 50% - 1 done, 1 remaining)

### Expected Result:
- Progress recalculates when tasks are linked
- Progress recalculates when tasks are unlinked
- Progress reflects current state of linked tasks

### Verification Points:
- ✅ Progress updates when task is linked
- ✅ Progress updates when task is unlinked
- ✅ Progress reflects correct completed/total ratio

---

## Test 6: Automatic Recalculation on Task Status Change

### Steps:
1. Create a "Task-based" goal
2. Link 3 tasks to the goal
3. Mark all 3 as "Done" → Progress should be 100%
4. Change Task 1 back to "Doing" → Progress should be 67% (2/3)
5. Change Task 1 back to "Done" → Progress should be 100% (3/3)

### Expected Result:
- Progress recalculates when task status changes to/from "done"
- Progress updates immediately (via database trigger)
- Progress reflects current task completion state

### Verification Points:
- ✅ Progress updates when task marked as "done"
- ✅ Progress updates when task marked as not "done"
- ✅ No page refresh needed - updates happen automatically

---

## Test 7: Edge Cases

### Test 7a: No Tasks Linked
1. Create a "Task-based" goal
2. Don't link any tasks
3. **Expected**: Progress should be **0%**

### Test 7b: All Tasks Completed
1. Create a "Task-based" goal
2. Link 5 tasks
3. Mark all 5 as "Done"
4. **Expected**: Progress should be **100%**

### Test 7c: No Milestones
1. Create a "Milestone-based" goal
2. Don't add any milestones
3. **Expected**: Progress should be **0%**

### Test 7d: All Milestones Completed
1. Create a "Milestone-based" goal
2. Add 3 milestones
3. Mark all 3 as complete
4. **Expected**: Progress should be **100%**

### Test 7e: Mixed Progress Types
1. Create 3 goals:
   - Goal 1: Manual (set to 50%)
   - Goal 2: Task-based (link 2 tasks, complete 1)
   - Goal 3: Milestone-based (add 4 milestones, complete 2)
2. **Expected**: 
   - Goal 1: Shows 50% (manual)
   - Goal 2: Shows 50% (1/2 tasks done)
   - Goal 3: Shows 50% (2/4 milestones done)

---

## Test 8: Database Trigger Verification

### Steps:
1. Create a "Task-based" goal
2. Link 2 tasks
3. Mark both as "Done"
4. Check goal progress in UI (should be 100%)
5. Check database directly (optional):
   ```sql
   SELECT id, title, progress_type, progress_value 
   FROM goals 
   WHERE title = 'Test Task-Based Goal';
   ```
6. Change one task status in database:
   ```sql
   UPDATE tasks SET status = 'todo' WHERE id = '<task_id>';
   ```
7. Refresh UI and check goal progress (should be 50%)

### Expected Result:
- Database triggers automatically update `progress_value` column
- UI reflects database state
- No manual recalculation needed

---

## Quick Test Checklist

- [ ] Manual progress type works
- [ ] Task-based progress calculates correctly (simple counting)
- [ ] Task-based progress calculates correctly (weighted)
- [ ] Milestone-based progress calculates correctly
- [ ] Progress updates when task is completed
- [ ] Progress updates when task is uncompleted
- [ ] Progress updates when task is linked
- [ ] Progress updates when task is unlinked
- [ ] Progress updates when milestone is toggled
- [ ] Progress rounds correctly (33.33% → 33%)
- [ ] Edge cases handled (0 tasks, 0 milestones, etc.)
- [ ] Database triggers work automatically

---

## Troubleshooting

### Categories Not Loading?
- Check browser console for errors
- Verify you're logged in
- Check network tab for `/api/categories` request
- Ensure categories exist in database

### Progress Not Updating?
- Check browser console for errors
- Verify database triggers are installed (run migration)
- Check network tab for API calls
- Refresh page to see if it's a UI update issue

### Wrong Progress Calculation?
- Check task statuses (must be "done" to count as completed)
- Verify task weights if using weighted calculation
- Check milestone `is_complete` field
- Verify goal `progress_type` is correct

---

## Database Verification (Optional)

To verify triggers are working:

```sql
-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%progress%' OR trigger_name LIKE '%goal%';

-- Check a goal's progress
SELECT id, title, progress_type, progress_value 
FROM goals 
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC;

-- Check linked tasks for a goal
SELECT gt.goal_id, gt.task_id, gt.contribution_weight, t.status
FROM goal_tasks gt
JOIN tasks t ON gt.task_id = t.id
WHERE gt.goal_id = '<goal_id>';

-- Check milestones for a goal
SELECT id, goal_id, title, is_complete
FROM goal_milestones
WHERE goal_id = '<goal_id>'
ORDER BY display_order;
```

---

## Success Criteria

✅ All progress types calculate correctly  
✅ Progress updates automatically via database triggers  
✅ No manual refresh needed for progress updates  
✅ Edge cases handled gracefully  
✅ Progress values are between 0-100  
✅ Progress rounds correctly  
