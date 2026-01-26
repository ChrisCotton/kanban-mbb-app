# Kanban Goal Filtering Implementation

## Summary

This document describes the implementation of goal filtering functionality in the Kanban board, allowing users to filter tasks by clicking on goals in the Goals Header Strip.

## Features Implemented

### 1. Goal Filtering in Task Queries
- **Modified `getTasks` function** (`lib/database/kanban-queries.ts`):
  - Added optional `goalId` parameter
  - When `goalId` is provided, queries `goal_tasks` junction table to get linked task IDs
  - Filters tasks to only those linked to the specified goal
  - Returns empty array if no tasks are linked to the goal

### 2. API Route Updates
- **Updated `/api/kanban/tasks` endpoint** (`pages/api/kanban/tasks/index.ts`):
  - Accepts optional `goal_id` query parameter
  - Validates `goal_id` format
  - Passes `goal_id` to `getTasks` function

### 3. useKanban Hook Enhancement
- **Modified `useKanban` hook** (`hooks/useKanban.ts`):
  - Updated `fetchTasks` to accept optional `goalId` parameter
  - Builds API URL with `goal_id` query parameter when filtering
  - Updated TypeScript interface to reflect new signature

### 4. FilterIndicator Component
- **Created `FilterIndicator` component** (`components/kanban/FilterIndicator.tsx`):
  - Displays active goal filter with goal icon and title
  - Shows "Filtered by goal:" message
  - Provides clear button (X) to remove filter
  - Styled with blue theme to indicate active filter state

### 5. KanbanBoard Integration
- **Updated `KanbanBoard` component** (`components/kanban/KanbanBoard.tsx`):
  - Integrated `GoalsHeaderStrip` component at top of board
  - Added `FilterIndicator` that appears when goal filter is active
  - Implemented `handleGoalClick` callback:
    - Toggles filter (clicking same goal clears filter)
    - Calls `fetchTasks` with goal ID
  - Implemented `handleClearGoalFilter` callback
  - Added `useEffect` to refetch tasks when `activeGoalFilter` changes
  - Modified `handleModalSave` to auto-link new tasks to active goal:
    - When creating a task with active goal filter
    - Automatically creates link in `goal_tasks` junction table
    - Uses contribution weight of 1
  - Updated task display logic to use filtered tasks
  - Updated stats calculation to reflect filtered counts

## Test Scenarios

The following test scenarios are covered in `__tests__/components/kanban/KanbanGoalFiltering.test.tsx`:

1. ✅ Clicking goal in header filters tasks
2. ✅ Only tasks linked to selected goal show
3. ✅ Column counts update to filtered counts
4. ✅ Filter indicator bar appears
5. ✅ Clicking X clears filter
6. ✅ Clicking same goal clears filter
7. ✅ New task in filtered mode auto-links to goal

## Usage

### Filtering Tasks by Goal

1. **Activate Filter**: Click on a goal card in the Goals Header Strip
   - The board will refresh to show only tasks linked to that goal
   - Filter indicator appears showing the active goal

2. **Clear Filter**: 
   - Click the X button in the filter indicator, OR
   - Click the same goal card again

3. **Create Task with Auto-Link**:
   - When a goal filter is active, creating a new task automatically links it to that goal
   - The task appears immediately in the filtered view

## Technical Details

### Database Query Pattern

When filtering by goal, the system:
1. Queries `goal_tasks` table to get all `task_id` values for the given `goal_id`
2. Uses `IN` clause to filter `tasks` table by those IDs
3. Returns empty array if no tasks are linked (prevents unnecessary queries)

### State Management

- **Goals Store**: Manages `activeGoalFilter` state
- **Kanban Hook**: Manages filtered task state
- **Component**: Coordinates between stores and handles UI updates

### Performance Considerations

- Server-side filtering reduces data transfer
- Empty result handling prevents unnecessary processing
- Optimistic updates maintain responsive UI during filtering

## Files Modified

1. `lib/database/kanban-queries.ts` - Added goal filtering to `getTasks`
2. `pages/api/kanban/tasks/index.ts` - Added `goal_id` query parameter support
3. `hooks/useKanban.ts` - Updated `fetchTasks` to accept `goalId`
4. `components/kanban/KanbanBoard.tsx` - Integrated filtering UI and logic
5. `components/kanban/FilterIndicator.tsx` - New component for filter indicator

## Next Steps

- [ ] Add unit tests for FilterIndicator component
- [ ] Add integration tests for goal filtering flow
- [ ] Consider adding keyboard shortcuts for filter management
- [ ] Add visual feedback when tasks are being filtered
- [ ] Consider persisting filter state in URL query params
