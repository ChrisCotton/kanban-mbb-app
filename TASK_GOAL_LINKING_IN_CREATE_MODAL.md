# Task-Goal Linking in Create Modal - Implementation

## Summary
Added goal linking functionality to the TaskModal component, allowing users to link goals when creating new tasks, just like they can when editing tasks.

## Problem
When creating a new task, users could not link it to goals. Goal linking was only available in TaskDetailModal when editing existing tasks.

## Solution

### 1. Added Goal Selection UI (`components/kanban/TaskModal.tsx`)
- Added goal selection dropdown (only visible when creating new tasks)
- Shows "+ Link Goal" button
- Displays selected goals with remove buttons
- Filters out already selected goals from dropdown
- Only shows active goals

### 2. State Management
- Added `selectedGoalIds` state to track selected goals
- Added `isGoalDropdownOpen` state for dropdown visibility
- Added `isLinkingGoals` state for loading indicator
- Integrated with `useGoalsStore` to fetch available goals

### 3. Goal Linking Logic
- After task is created, automatically links selected goals
- Uses the same API endpoint as TaskDetailModal (`/api/goals/[id]/tasks`)
- Links are created with default contribution weight of 1
- Errors are logged but don't block task creation

### 4. Updated onSave Signature
- Modified `onSave` prop to return `Promise<Task | void>`
- Returns created task when creating, void when editing
- Updated `KanbanBoard.handleModalSave` to return created task

## Files Changed

### Modified Files
1. **`components/kanban/TaskModal.tsx`**
   - Added goal selection UI
   - Added goal linking logic after task creation
   - Added useGoalsStore integration
   - Added click-outside handler for dropdown

2. **`components/kanban/KanbanBoard.tsx`**
   - Updated `handleModalSave` to return created task
   - Ensures task is returned for goal linking

3. **`components/kanban/TaskModal.test.tsx`**
   - Added useGoalsStore mock
   - Updated prop names from `onSubmit` to `onSave`

## Usage

### Linking Goals When Creating a Task

1. Click "+ New Task" button
2. Fill in task details (title, description, etc.)
3. Scroll to "Goals" section
4. Click "+ Link Goal" button
5. Select a goal from the dropdown
6. Selected goal appears below with remove button (X)
7. Can select multiple goals
8. Click "Create Task"
9. Task is created and goals are automatically linked

### Visual Features

- **Goal Dropdown**: Shows all active goals not already selected
- **Selected Goals**: Displayed as cards with goal icon and title
- **Remove Button**: X button to remove a selected goal
- **Empty State**: Shows "No goals linked" when none selected

## Technical Details

### API Integration
- Uses existing `/api/goals/[id]/tasks` POST endpoint
- Requires authentication token
- Links created with `contribution_weight: 1`

### Error Handling
- Goal linking errors are logged but don't prevent task creation
- User can still create task even if goal linking fails
- Errors are logged to console for debugging

### State Management
- Goals fetched from `useGoalsStore`
- Selected goals stored in component state
- Links created after successful task creation

## Testing

### Manual Testing
1. ✅ Create new task
2. ✅ Select goals before creating
3. ✅ Verify goals are linked after creation
4. ✅ Remove selected goals before creating
5. ✅ Create task without selecting goals

### Test Updates Needed
- Update TaskModal tests to use `onSave` instead of `onSubmit`
- Add tests for goal selection UI
- Add tests for goal linking after creation
- Mock useGoalsStore properly

## Status
✅ **IMPLEMENTED** - Goal linking now available when creating new tasks
