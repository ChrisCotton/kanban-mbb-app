import { GoalsService } from '../../../src/services/goals.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('GoalsService - Task Linking', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let service: GoalsService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as any;

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = new GoalsService(mockSupabase);
  });

  describe('linkTaskToGoal', () => {
    it('creates link between task and goal', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: {
          goal_id: 'goal-1',
          task_id: 'task-1',
          contribution_weight: 1,
          created_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await service.linkTaskToGoal('goal-1', 'task-1', 1, 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('goal_tasks');
      expect(mockInsert).toHaveBeenCalledWith({
        goal_id: 'goal-1',
        task_id: 'task-1',
        contribution_weight: 1,
      });
      expect(result).toEqual({
        goal_id: 'goal-1',
        task_id: 'task-1',
        contribution_weight: 1,
        created_at: '2026-01-01T00:00:00Z',
      });
    });

    it('throws error if link already exists', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' }, // PostgreSQL unique violation
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        service.linkTaskToGoal('goal-1', 'task-1', 1, 'user-1')
      ).rejects.toThrow('Task is already linked to this goal');
    });

    it('validates contribution weight range', async () => {
      await expect(
        service.linkTaskToGoal('goal-1', 'task-1', 0, 'user-1')
      ).rejects.toThrow('contribution_weight must be between 1 and 10');

      await expect(
        service.linkTaskToGoal('goal-1', 'task-1', 11, 'user-1')
      ).rejects.toThrow('contribution_weight must be between 1 and 10');
    });
  });

  describe('unlinkTaskFromGoal', () => {
    it('removes link between task and goal', async () => {
      const mockDelete = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockDelete,
          }),
        }),
      });

      await service.unlinkTaskFromGoal('goal-1', 'task-1', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('goal_tasks');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws error if link does not exist', async () => {
      const mockDelete = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows deleted' },
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockDelete,
          }),
        }),
      });

      await expect(
        service.unlinkTaskFromGoal('goal-1', 'task-1', 'user-1')
      ).rejects.toThrow('Task is not linked to this goal');
    });
  });

  describe('getTaskGoals', () => {
    it('returns all goals linked to a task', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [
          {
            goal_id: 'goal-1',
            task_id: 'task-1',
            contribution_weight: 1,
            created_at: '2026-01-01T00:00:00Z',
            goal: mockGoal1,
          },
        ],
        error: null,
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockSelect),
        }),
      });

      const result = await service.getTaskGoals('task-1', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('goal_tasks');
      expect(result).toHaveLength(1);
      expect(result[0].goal_id).toBe('goal-1');
    });
  });
});

const mockGoal1 = {
  id: 'goal-1',
  title: 'Goal 1',
  status: 'active',
};
