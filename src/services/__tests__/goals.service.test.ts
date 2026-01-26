import { GoalsService } from '../goals.service';
import { mockGoal, mockGoalMinimal, mockGoalCompleted, mockCreateGoalInput, mockGoalsList, TEST_USER_ID, createMockGoals } from '../../test/fixtures/goals';
import { Goal, CreateGoalInput, GoalFilters, GoalSortOptions } from '../../types/goals';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('GoalsService', () => {
  let service: GoalsService;
  let mockSupabase: any;
  let queryChain: any;
  let queryResultMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query chain
    queryResultMock = jest.fn();
    queryChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve(queryResultMock())),
      then: jest.fn((onfulfilled?: (value: any) => any) => {
        return Promise.resolve(queryResultMock()).then(onfulfilled);
      }),
    };

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(() => queryChain),
      auth: {
        getUser: jest.fn(() => Promise.resolve({ 
          data: { user: { id: TEST_USER_ID } }, 
          error: null 
        })),
      },
    };

    service = new GoalsService(mockSupabase);
  });

  describe('getGoals', () => {
    it('should return all goals for user', async () => {
      const goals = createMockGoals(3);
      queryResultMock.mockReturnValue({ data: goals, error: null });

      const result = await service.getGoals();

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.select).toHaveBeenCalled();
      expect(queryChain.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
      expect(result.goals).toHaveLength(3);
      expect(result.goals).toEqual(goals);
    });

    it('should filter by status', async () => {
      queryResultMock.mockReturnValue({ data: [mockGoal], error: null });

      const filters: GoalFilters = { status: 'active' };
      await service.getGoals(filters);

      expect(queryChain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should filter by category_id', async () => {
      queryResultMock.mockReturnValue({ data: [mockGoal], error: null });

      const filters: GoalFilters = { category_id: 'test-category-id' };
      await service.getGoals(filters);

      expect(queryChain.eq).toHaveBeenCalledWith('category_id', 'test-category-id');
    });

    it('should filter by multiple statuses', async () => {
      queryResultMock.mockReturnValue({ data: [mockGoal, mockGoalCompleted], error: null });

      const filters: GoalFilters = { status: ['active', 'completed'] };
      await service.getGoals(filters);

      expect(queryChain.in).toHaveBeenCalledWith('status', ['active', 'completed']);
    });

    it('should sort by field and direction', async () => {
      queryResultMock.mockReturnValue({ data: mockGoalsList, error: null });

      const sort: GoalSortOptions = { field: 'target_date', direction: 'asc' };
      await service.getGoals(undefined, sort);

      expect(queryChain.order).toHaveBeenCalledWith('target_date', { ascending: true });
    });

    it('should throw on database error', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { message: 'DB error', code: 'PGRST116' } 
      });

      await expect(service.getGoals()).rejects.toThrow('DB error');
    });
  });

  describe('getGoalById', () => {
    it('should return single goal', async () => {
      queryResultMock.mockReturnValue({ data: mockGoal, error: null });

      const result = await service.getGoalById(mockGoal.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.select).toHaveBeenCalled();
      expect(queryChain.eq).toHaveBeenCalledWith('id', mockGoal.id);
      expect(queryChain.single).toHaveBeenCalled();
      expect(result.id).toBe(mockGoal.id);
      expect(result.title).toBe(mockGoal.title);
    });

    it('should throw when not found', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      await expect(service.getGoalById('fake-id')).rejects.toThrow('Goal not found');
    });

    it('should throw on database error', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(service.getGoalById('test-id')).rejects.toThrow('Database error');
    });
  });

  describe('createGoal', () => {
    it('should create goal with valid input', async () => {
      queryResultMock.mockReturnValue({ data: mockGoal, error: null });

      const result = await service.createGoal(mockCreateGoalInput);

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.insert).toHaveBeenCalled();
      expect(queryChain.single).toHaveBeenCalled();
      expect(result.title).toBe(mockGoal.title);
      expect(result.id).toBe(mockGoal.id);
    });

    it('should set default values for optional fields', async () => {
      const minimalInput: CreateGoalInput = { title: 'Minimal Goal' };
      queryResultMock.mockReturnValue({ data: mockGoalMinimal, error: null });

      await service.createGoal(minimalInput);

      const insertCall = queryChain.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('active');
      expect(insertCall.progress_type).toBe('manual');
      expect(insertCall.progress_value).toBe(0);
    });

    it('should reject empty title', async () => {
      await expect(service.createGoal({ title: '' })).rejects.toThrow('Title is required');
    });

    it('should reject title over 255 chars', async () => {
      await expect(service.createGoal({ title: 'A'.repeat(256) })).rejects.toThrow('Title must be 255 characters or less');
    });

    it('should reject progress > 100', async () => {
      await expect(service.createGoal({ title: 'Test', progress_value: 150 })).rejects.toThrow('Progress value must be between 0 and 100');
    });

    it('should reject negative progress', async () => {
      await expect(service.createGoal({ title: 'Test', progress_value: -10 })).rejects.toThrow('Progress value must be between 0 and 100');
    });

    it('should throw on database error', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(service.createGoal(mockCreateGoalInput)).rejects.toThrow('Database error');
    });
  });

  describe('updateGoal', () => {
    it('should update goal fields', async () => {
      const updated = { ...mockGoal, title: 'Updated Title', progress_value: 75 };
      queryResultMock.mockReturnValue({ data: updated, error: null });

      const result = await service.updateGoal(mockGoal.id, { 
        title: 'Updated Title', 
        progress_value: 75 
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.update).toHaveBeenCalled();
      expect(queryChain.eq).toHaveBeenCalledWith('id', mockGoal.id);
      expect(queryChain.single).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
      expect(result.progress_value).toBe(75);
    });

    it('should validate progress value on update', async () => {
      await expect(
        service.updateGoal(mockGoal.id, { progress_value: 150 })
      ).rejects.toThrow('Progress value must be between 0 and 100');
    });

    it('should throw when goal not found', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      await expect(service.updateGoal('fake-id', { title: 'Updated' })).rejects.toThrow('Goal not found');
    });
  });

  describe('deleteGoal', () => {
    it('should soft delete (archive) goal', async () => {
      const archived = { ...mockGoal, status: 'archived' };
      queryResultMock.mockReturnValue({ data: archived, error: null });

      const result = await service.deleteGoal(mockGoal.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.update).toHaveBeenCalledWith({ status: 'archived' });
      expect(queryChain.eq).toHaveBeenCalledWith('id', mockGoal.id);
      expect(queryChain.single).toHaveBeenCalled();
      expect(result.status).toBe('archived');
    });

    it('should throw when goal not found', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      await expect(service.deleteGoal('fake-id')).rejects.toThrow('Goal not found');
    });
  });

  describe('completeGoal', () => {
    it('should mark goal completed with 100% progress', async () => {
      const completed = { 
        ...mockGoal, 
        status: 'completed', 
        progress_value: 100,
        completed_at: new Date().toISOString()
      };
      queryResultMock.mockReturnValue({ data: completed, error: null });

      const result = await service.completeGoal(mockGoal.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(queryChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress_value: 100,
        })
      );
      expect(queryChain.eq).toHaveBeenCalledWith('id', mockGoal.id);
      expect(queryChain.single).toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.progress_value).toBe(100);
      expect(result.completed_at).toBeTruthy();
    });

    it('should throw when goal not found', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      await expect(service.completeGoal('fake-id')).rejects.toThrow('Goal not found');
    });
  });

  describe('reorderGoals', () => {
    it('should update display_order for multiple goals', async () => {
      const goalIds = ['goal-1', 'goal-2', 'goal-3'];
      // Mock supabase.from to return a new query chain for each call
      mockSupabase.from.mockReturnValue(queryChain);
      queryResultMock.mockReturnValue({ data: null, error: null });

      await service.reorderGoals(goalIds);

      // Should call from('goals') for each goal
      expect(mockSupabase.from).toHaveBeenCalledTimes(goalIds.length);
      expect(queryChain.update).toHaveBeenCalledTimes(goalIds.length);
      expect(queryChain.eq).toHaveBeenCalledTimes(goalIds.length * 2); // id and user_id
    });

    it('should set display_order based on array index', async () => {
      const goalIds = ['goal-1', 'goal-2', 'goal-3'];
      mockSupabase.from.mockReturnValue(queryChain);
      queryResultMock.mockReturnValue({ data: null, error: null });

      await service.reorderGoals(goalIds);

      // Check that display_order is set correctly
      const updateCalls = queryChain.update.mock.calls;
      expect(updateCalls[0][0].display_order).toBe(0);
      expect(updateCalls[1][0].display_order).toBe(1);
      expect(updateCalls[2][0].display_order).toBe(2);
    });

    it('should throw when reorder fails', async () => {
      const goalIds = ['goal-1', 'goal-2'];
      mockSupabase.from.mockReturnValue(queryChain);
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      await expect(service.reorderGoals(goalIds)).rejects.toThrow('Failed to reorder goals');
    });
  });

  describe('getCurrentUserId', () => {
    it('should throw when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: { message: 'Not authenticated' } 
      });

      await expect(service.getGoals()).rejects.toThrow('User not authenticated');
    });
  });

  describe('getGoals filters', () => {
    it('should filter by has_target_date = true', async () => {
      queryResultMock.mockReturnValue({ data: [mockGoal], error: null });

      await service.getGoals({ has_target_date: true });

      expect(queryChain.not).toHaveBeenCalledWith('target_date', 'is', null);
    });

    it('should filter by has_target_date = false', async () => {
      queryResultMock.mockReturnValue({ data: [mockGoalMinimal], error: null });

      await service.getGoals({ has_target_date: false });

      expect(queryChain.is).toHaveBeenCalledWith('target_date', null);
    });

    it('should filter by overdue goals', async () => {
      queryResultMock.mockReturnValue({ data: [], error: null });

      await service.getGoals({ overdue: true });

      expect(queryChain.lt).toHaveBeenCalled();
      expect(queryChain.neq).toHaveBeenCalledWith('status', 'completed');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle getGoalById with null data and no error', async () => {
      queryResultMock.mockReturnValue({ data: null, error: null });

      await expect(service.getGoalById('test-id')).rejects.toThrow('Goal not found');
    });

    it('should handle updateGoal with non-PGRST116 error', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'OTHER_ERROR', message: 'Database error' } 
      });

      await expect(service.updateGoal('test-id', { title: 'Updated' })).rejects.toThrow('Database error');
    });

    it('should handle updateGoal with null data and no error', async () => {
      queryResultMock.mockReturnValue({ data: null, error: null });

      await expect(service.updateGoal('test-id', { title: 'Updated' })).rejects.toThrow('Goal not found');
    });

    it('should handle completeGoal with non-PGRST116 error', async () => {
      queryResultMock.mockReturnValue({ 
        data: null, 
        error: { code: 'OTHER_ERROR', message: 'Database error' } 
      });

      await expect(service.completeGoal('test-id')).rejects.toThrow('Database error');
    });

    it('should handle completeGoal with null data and no error', async () => {
      queryResultMock.mockReturnValue({ data: null, error: null });

      await expect(service.completeGoal('test-id')).rejects.toThrow('Goal not found');
    });
  });
});
