import {
  Goal,
  GoalWithRelations,
  GoalMilestone,
  GoalTask,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStatus,
  GoalProgressType,
} from '../../lib/types/goals';

/**
 * Test fixtures for Goals module
 * Use these in tests to create consistent test data
 */

// Test user IDs
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';

// Test category IDs
export const TEST_CATEGORY_ID = '10000000-0000-0000-0000-000000000001';
export const TEST_CATEGORY_ID_2 = '10000000-0000-0000-0000-000000000002';

// Test task IDs
export const TEST_TASK_ID = '20000000-0000-0000-0000-000000000001';
export const TEST_TASK_ID_2 = '20000000-0000-0000-0000-000000000002';

// Test vision image IDs
export const TEST_VISION_IMAGE_ID = '30000000-0000-0000-0000-000000000001';
export const TEST_VISION_IMAGE_ID_2 = '30000000-0000-0000-0000-000000000002';

/**
 * Creates a minimal goal fixture
 */
export function createGoalFixture(overrides?: Partial<Goal>): Goal {
  const now = new Date().toISOString();
  return {
    id: '40000000-0000-0000-0000-000000000001',
    user_id: TEST_USER_ID,
    title: 'Test Goal',
    description: 'Test goal description',
    status: 'active',
    progress_type: 'manual',
    progress_value: 0,
    target_date: null,
    category_id: null,
    color: null,
    icon: null,
    display_order: 0,
    created_at: now,
    updated_at: now,
    completed_at: null,
    ...overrides,
  };
}

/**
 * Creates a goal with relations fixture
 */
export function createGoalWithRelationsFixture(
  overrides?: Partial<GoalWithRelations>
): GoalWithRelations {
  const baseGoal = createGoalFixture(overrides);
  return {
    ...baseGoal,
    category: null,
    linked_tasks_count: 0,
    vision_images: [],
    milestones: [],
    ...overrides,
  };
}

/**
 * Creates a goal milestone fixture
 */
export function createGoalMilestoneFixture(
  goalId: string,
  overrides?: Partial<GoalMilestone>
): GoalMilestone {
  const now = new Date().toISOString();
  return {
    id: '50000000-0000-0000-0000-000000000001',
    goal_id: goalId,
    title: 'Test Milestone',
    is_complete: false,
    display_order: 0,
    created_at: now,
    completed_at: null,
    ...overrides,
  };
}

/**
 * Creates a goal-task relationship fixture
 */
export function createGoalTaskFixture(
  goalId: string,
  taskId: string,
  overrides?: Partial<GoalTask>
): GoalTask {
  const now = new Date().toISOString();
  return {
    goal_id: goalId,
    task_id: taskId,
    contribution_weight: 1,
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a CreateGoalInput fixture
 */
export function createGoalInputFixture(
  overrides?: Partial<CreateGoalInput>
): CreateGoalInput {
  return {
    title: 'New Test Goal',
    description: 'Test description',
    status: 'active',
    progress_type: 'manual',
    progress_value: 0,
    ...overrides,
  };
}

/**
 * Creates an UpdateGoalInput fixture
 */
export function createUpdateGoalInputFixture(
  overrides?: Partial<UpdateGoalInput>
): UpdateGoalInput {
  return {
    title: 'Updated Test Goal',
    progress_value: 50,
    ...overrides,
  };
}

/**
 * Pre-defined goal fixtures for common test scenarios
 */

// Active goal with task-based progress
export const ACTIVE_TASK_BASED_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000010',
  title: 'Launch MVP',
  description: 'Launch the minimum viable product',
  status: 'active',
  progress_type: 'task_based',
  progress_value: 45,
  target_date: '2026-02-19',
  category_id: TEST_CATEGORY_ID,
  color: '#3B82F6',
  icon: '🚀',
  display_order: 0,
});

// Completed goal
export const COMPLETED_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000020',
  title: 'Complete Onboarding',
  status: 'completed',
  progress_type: 'manual',
  progress_value: 100,
  completed_at: new Date().toISOString(),
  display_order: 1,
});

// Archived goal
export const ARCHIVED_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000030',
  title: 'Old Project',
  status: 'archived',
  progress_type: 'manual',
  progress_value: 30,
  display_order: 2,
});

// Goal with milestone-based progress
export const MILESTONE_BASED_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000040',
  title: 'Learn Piano',
  description: 'Learn to play piano',
  status: 'active',
  progress_type: 'milestone_based',
  progress_value: 33,
  target_date: '2026-12-31',
  category_id: TEST_CATEGORY_ID_2,
  color: '#8B5CF6',
  icon: '🎹',
  display_order: 3,
});

// Goal with overdue target date
export const OVERDUE_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000050',
  title: 'Overdue Goal',
  status: 'active',
  progress_type: 'manual',
  progress_value: 25,
  target_date: '2025-01-01', // Past date
  display_order: 4,
});

// Goal with no target date
export const NO_TARGET_DATE_GOAL: Goal = createGoalFixture({
  id: '40000000-0000-0000-0000-000000000060',
  title: 'Open-ended Goal',
  status: 'active',
  progress_type: 'manual',
  progress_value: 10,
  target_date: null,
  display_order: 5,
});

/**
 * Array of all pre-defined goal fixtures
 */
export const ALL_GOAL_FIXTURES: Goal[] = [
  ACTIVE_TASK_BASED_GOAL,
  COMPLETED_GOAL,
  ARCHIVED_GOAL,
  MILESTONE_BASED_GOAL,
  OVERDUE_GOAL,
  NO_TARGET_DATE_GOAL,
];

/**
 * Pre-defined milestone fixtures
 */
export const MILESTONE_FIXTURES: GoalMilestone[] = [
  createGoalMilestoneFixture(MILESTONE_BASED_GOAL.id, {
    id: '50000000-0000-0000-0000-000000000010',
    title: 'Learn basic chords',
    is_complete: true,
    display_order: 0,
    completed_at: new Date().toISOString(),
  }),
  createGoalMilestoneFixture(MILESTONE_BASED_GOAL.id, {
    id: '50000000-0000-0000-0000-000000000020',
    title: 'Play first song',
    is_complete: true,
    display_order: 1,
    completed_at: new Date().toISOString(),
  }),
  createGoalMilestoneFixture(MILESTONE_BASED_GOAL.id, {
    id: '50000000-0000-0000-0000-000000000030',
    title: 'Master advanced techniques',
    is_complete: false,
    display_order: 2,
  }),
];

/**
 * Pre-defined goal-task relationship fixtures
 */
export const GOAL_TASK_FIXTURES: GoalTask[] = [
  createGoalTaskFixture(ACTIVE_TASK_BASED_GOAL.id, TEST_TASK_ID, {
    contribution_weight: 5,
  }),
  createGoalTaskFixture(ACTIVE_TASK_BASED_GOAL.id, TEST_TASK_ID_2, {
    contribution_weight: 3,
  }),
];

/**
 * Helper function to create multiple goals
 */
export function createMultipleGoals(count: number, baseOverrides?: Partial<Goal>): Goal[] {
  return Array.from({ length: count }, (_, index) =>
    createGoalFixture({
      id: `40000000-0000-0000-0000-00000000${String(index + 1).padStart(4, '0')}`,
      title: `Test Goal ${index + 1}`,
      display_order: index,
      ...baseOverrides,
    })
  );
}

/**
 * Helper function to create goals with different statuses
 */
export function createGoalsByStatus(): Record<GoalStatus, Goal> {
  return {
    active: createGoalFixture({ status: 'active' }),
    completed: createGoalFixture({
      status: 'completed',
      progress_value: 100,
      completed_at: new Date().toISOString(),
    }),
    archived: createGoalFixture({ status: 'archived' }),
  };
}
