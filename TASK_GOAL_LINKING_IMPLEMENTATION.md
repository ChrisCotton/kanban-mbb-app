# Task-Goal Linking Implementation

## Summary

This document describes the implementation of Task-Goal Linking functionality, allowing users to link tasks to goals directly from the Task Detail Panel.

## Features Implemented

### 1. TaskGoalLink Component
- **Created `TaskGoalLink` component** (`components/kanban/TaskGoalLink.tsx`):
  - Displays linked goals section in Task Detail Panel
  - Shows "+ Link" button that opens goal selector dropdown
  - Filters out already linked goals from dropdown
  - Allows selecting a goal to create a link
  - Shows X button to remove links
  - Supports multiple goal links per task

### 2. GoalsService Methods
- **Added linking methods to `GoalsService`** (`src/services/goals.service.ts`):
  - `linkTaskToGoal(goalId, taskId, contributionWeight, userId)` - Creates link between task and goal
  - `unlinkTaskFromGoal(goalId, taskId, userId)` - Removes link between task and goal
  - `getTaskGoals(taskId, userId)` - Returns all goals linked to a task
  - `addGoalTask` and `removeGoalTask` - Aliases for consistency with existing API
  - Validates contribution weight (1-10 range)
  - Handles duplicate link errors
  - Verifies user ownership of goals

### 3. API Routes
- **Created `/api/tasks/[id]/goals` endpoint** (`pages/api/tasks/[id]/goals.ts`):
  - GET: Returns all goals linked to a task
  - Uses existing `/api/goals/[id]/tasks` endpoints for POST/DELETE operations
  - Validates authentication and user ownership

### 4. useTaskGoals Hook
- **Created `useTaskGoals` hook** (`hooks/useTaskGoals.ts`):
  - Fetches linked goals for a task
  - Provides loading and error states
  - Supports refetching when links change

### 5. TaskDetailModal Integration
- **Updated `TaskDetailModal`** (`components/kanban/TaskDetailModal.tsx`):
  - Integrated `TaskGoalLink` component
  - Added `useTaskGoals` hook to fetch linked goals
  - Displays goals section below subtasks
  - Refetches goals when links change

## Test Scenarios

The following test scenarios are covered:

1. ✅ Goals section appears in Task Detail Panel
2. ✅ "+ Link" opens goal selector dropdown
3. ✅ Selecting goal creates link
4. ✅ X button removes link
5. ✅ Task can link to multiple goals
6. ✅ Filters out already linked goals from dropdown

## Usage

### Linking a Task to a Goal

1. **Open Task Detail Panel**: Click on any task in the Kanban board
2. **View Goals Section**: Scroll to the "Goals" section below subtasks
3. **Link Goal**: 
   - Click "+ Link" button
   - Select a goal from the dropdown
   - The link is created automatically

### Unlinking a Task from a Goal

1. **Open Task Detail Panel**: Click on the task
2. **View Linked Goals**: See all linked goals in the Goals section
3. **Remove Link**: Click the X button next to the goal you want to unlink

### Multiple Goal Links

- A task can be linked to multiple goals simultaneously
- Each link has a contribution weight (default: 1)
- Linked goals are displayed as a list with remove buttons

## Technical Details

### Database Structure

- Uses `goal_tasks` junction table:
  - `goal_id` (UUID) - References goals table
  - `task_id` (UUID) - References tasks table
  - `contribution_weight` (INTEGER) - Weight 1-10
  - Primary key: (goal_id, task_id)

### API Endpoints

- `GET /api/tasks/[id]/goals` - Get goals linked to task
- `POST /api/goals/[id]/tasks` - Link task to goal (existing)
- `DELETE /api/goals/[id]/tasks` - Unlink task from goal (existing)

### Component Props

**TaskGoalLink:**
- `task: Task` - The task to link goals to
- `linkedGoals: GoalTask[]` - Array of currently linked goals
- `onLinkChange?: () => void` - Callback when links change

## Files Created/Modified

### Created Files
1. `components/kanban/TaskGoalLink.tsx` - Main component
2. `hooks/useTaskGoals.ts` - Hook for fetching task goals
3. `pages/api/tasks/[id]/goals.ts` - API endpoint
4. `__tests__/components/kanban/TaskGoalLink.test.tsx` - Component tests
5. `__tests__/services/goals.service.link.test.ts` - Service tests
6. `__tests__/api/tasks/[id]/goals.test.ts` - API route tests

### Modified Files
1. `src/services/goals.service.ts` - Added linking methods
2. `components/kanban/TaskDetailModal.tsx` - Integrated TaskGoalLink

## Next Steps

- [ ] Add goal progress recalculation on task completion (for task-based goals)
- [ ] Add contribution weight editing in UI
- [ ] Add visual indicators for goal progress in task cards
- [ ] Add bulk linking/unlinking operations
- [ ] Add goal filtering based on linked tasks

## Progress Recalculation (Pending)

When a task is completed and it's linked to a goal with `progress_type: 'task_based'`, the goal's progress should be recalculated based on:
- Total number of linked tasks
- Number of completed linked tasks
- Contribution weights of each task

This will be implemented in a future update.
