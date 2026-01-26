import { Goal, CreateGoalInput } from '../../types/goals';

export const TEST_USER_ID = 'test-user-uuid-12345';
export const TEST_CATEGORY_ID = 'test-category-uuid-12345';

export const mockGoal: Goal = {
  id: 'goal-uuid-1',
  user_id: TEST_USER_ID,
  title: 'Launch MVP with First 20 Customers',
  description: 'Build and launch the minimum viable product',
  status: 'active',
  progress_type: 'task_based',
  progress_value: 45,
  target_date: '2026-02-19',
  category_id: TEST_CATEGORY_ID,
  color: '#8B5CF6',
  icon: '🚀',
  display_order: 0,
  created_at: '2026-01-04T10:00:00.000Z',
  updated_at: '2026-01-24T15:30:00.000Z',
  completed_at: null,
};

export const mockGoalMinimal: Goal = {
  id: 'goal-uuid-minimal',
  user_id: TEST_USER_ID,
  title: 'Simple Goal',
  description: null,
  status: 'active',
  progress_type: 'manual',
  progress_value: 0,
  target_date: null,
  category_id: null,
  color: null,
  icon: null,
  display_order: 1,
  created_at: '2026-01-25T12:00:00.000Z',
  updated_at: '2026-01-25T12:00:00.000Z',
  completed_at: null,
};

export const mockGoalCompleted: Goal = {
  ...mockGoal,
  id: 'goal-uuid-completed',
  title: 'Completed Goal',
  status: 'completed',
  progress_value: 100,
  completed_at: '2026-01-20T09:00:00.000Z',
};

export const mockGoalsList: Goal[] = [mockGoal, mockGoalMinimal, mockGoalCompleted];

export const mockCreateGoalInput: CreateGoalInput = {
  title: 'New Test Goal',
  description: 'Test description',
  progress_type: 'manual',
  target_date: '2026-03-01',
};

export const mockInvalidInputs = {
  emptyTitle: { title: '' },
  titleTooLong: { title: 'A'.repeat(256) },
  progressOutOfRange: { title: 'Test', progress_value: 150 },
  negativeProgress: { title: 'Test', progress_value: -10 },
};

export const createMockGoals = (count: number): Goal[] => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockGoal,
    id: `goal-uuid-${i + 1}`,
    title: `Test Goal ${i + 1}`,
    display_order: i,
  }));
};
