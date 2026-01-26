import { act, renderHook } from '@testing-library/react';
import { useGoalsStore } from '../goals.store';
import { Goal, CreateGoalInput, UpdateGoalInput, GoalFilters, GoalSortOptions } from '../../types/goals';
import { mockGoal, mockGoalMinimal, mockGoalCompleted, mockCreateGoalInput, TEST_USER_ID } from '../../test/fixtures/goals';

// Mock fetch
global.fetch = jest.fn();

// Mock supabase auth
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: 'test-token',
            },
          },
        })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: 'test-user-uuid-12345',
            },
          },
        })
      ),
    },
  },
}));

describe('Goals Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useGoalsStore());
    act(() => {
      result.current.goals = [];
      result.current.isLoading = false;
      result.current.error = null;
      result.current.activeGoalFilter = null;
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useGoalsStore());

      expect(result.current.goals).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.activeGoalFilter).toBe(null);
    });
  });

  describe('fetchGoals', () => {
    it('should fetch goals and update state', async () => {
      const mockGoals = [mockGoal, mockGoalMinimal];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGoals,
          count: mockGoals.length,
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      await act(async () => {
        await result.current.fetchGoals();
      });

      expect(result.current.goals).toEqual(mockGoals);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle loading state', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        result.current.fetchGoals();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFetch!({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            count: 0,
          }),
        });
        await fetchPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGoalsStore());

      await act(async () => {
        try {
          await result.current.fetchGoals();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass filters and sort options', async () => {
      const filters: GoalFilters = { status: 'active' };
      const sort: GoalSortOptions = { field: 'target_date', direction: 'asc' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          count: 0,
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      await act(async () => {
        await result.current.fetchGoals(filters, sort);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
    });
  });

  describe('createGoal', () => {
    it('should create goal and add to store', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGoal,
          message: 'Goal created successfully',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      let createdGoal: Goal;
      await act(async () => {
        createdGoal = await result.current.createGoal(mockCreateGoalInput);
      });

      expect(createdGoal!).toEqual(mockGoal);
      expect(result.current.goals).toContainEqual(mockGoal);
      expect(result.current.error).toBe(null);
    });

    it('should handle creation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Title is required',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      await act(async () => {
        try {
          await result.current.createGoal(mockCreateGoalInput);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('updateGoal', () => {
    it('should update goal in store', async () => {
      const updatedGoal = { ...mockGoal, title: 'Updated Title' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedGoal,
          message: 'Goal updated successfully',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      // Set initial goals
      act(() => {
        useGoalsStore.setState({ goals: [mockGoal] });
      });

      let updated: Goal;
      await act(async () => {
        const input: UpdateGoalInput = { title: 'Updated Title' };
        updated = await result.current.updateGoal(mockGoal.id, input);
      });

      expect(updated!).toEqual(updatedGoal);
      expect(result.current.goals.find((g) => g.id === mockGoal.id)?.title).toBe('Updated Title');
    });

    it('should handle update errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Goal not found',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        useGoalsStore.setState({ goals: [mockGoal] });
      });

      await act(async () => {
        try {
          await result.current.updateGoal('fake-id', { title: 'Updated' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('deleteGoal', () => {
    it('should mark goal as archived', async () => {
      const archivedGoal = { ...mockGoal, status: 'archived' as const };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: archivedGoal,
          message: 'Goal archived successfully',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        useGoalsStore.setState({ goals: [mockGoal] });
      });

      await act(async () => {
        await result.current.deleteGoal(mockGoal.id);
      });

      const goal = result.current.goals.find((g) => g.id === mockGoal.id);
      expect(goal?.status).toBe('archived');
    });

    it('should handle delete errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        useGoalsStore.setState({ goals: [mockGoal] });
      });

      await act(async () => {
        try {
          await result.current.deleteGoal(mockGoal.id);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('completeGoal', () => {
    it('should mark goal as completed', async () => {
      // Create a completed version with the same ID as mockGoal
      const completedGoal = {
        ...mockGoalCompleted,
        id: mockGoal.id, // Use same ID as the goal we're completing
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: completedGoal,
          message: 'Goal marked as completed',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        useGoalsStore.setState({ goals: [mockGoal] });
      });

      let completed: Goal;
      await act(async () => {
        completed = await result.current.completeGoal(mockGoal.id);
      });

      expect(completed!).toEqual(completedGoal);
      
      const goal = result.current.goals.find((g) => g.id === mockGoal.id);
      expect(goal).toBeDefined();
      expect(goal?.status).toBe('completed');
      expect(goal?.progress_value).toBe(100);
    });
  });

  describe('setActiveGoalFilter', () => {
    it('should set active goal filter', () => {
      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        result.current.setActiveGoalFilter(mockGoal.id);
      });

      expect(result.current.activeGoalFilter).toBe(mockGoal.id);
    });

    it('should clear active goal filter when set to null', () => {
      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        result.current.setActiveGoalFilter(mockGoal.id);
      });

      expect(result.current.activeGoalFilter).toBe(mockGoal.id);

      act(() => {
        result.current.setActiveGoalFilter(null);
      });

      expect(result.current.activeGoalFilter).toBe(null);
    });
  });

  describe('reorderGoals', () => {
    it('should optimistically update display_order', async () => {
      const goals = [
        { ...mockGoal, id: 'goal-1', display_order: 0 },
        { ...mockGoalMinimal, id: 'goal-2', display_order: 1 },
        { ...mockGoalCompleted, id: 'goal-3', display_order: 2 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Goals reordered successfully',
        }),
      });

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        useGoalsStore.setState({ goals });
      });

      // Reorder: goal-3, goal-1, goal-2
      await act(async () => {
        await result.current.reorderGoals(['goal-3', 'goal-1', 'goal-2']);
      });

      expect(result.current.goals.find((g) => g.id === 'goal-3')?.display_order).toBe(0);
      expect(result.current.goals.find((g) => g.id === 'goal-1')?.display_order).toBe(1);
      expect(result.current.goals.find((g) => g.id === 'goal-2')?.display_order).toBe(2);
    });

    it('should handle reorder errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Reorder failed'));

      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        result.current.goals = [mockGoal, mockGoalMinimal];
      });

      await act(async () => {
        try {
          await result.current.reorderGoals(['goal-2', 'goal-1']);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useGoalsStore());
      act(() => {
        result.current.goals = [mockGoal, mockGoalMinimal, mockGoalCompleted];
      });
    });

    describe('getActiveGoals', () => {
      it('should return only active goals', () => {
        const { result } = renderHook(() => useGoalsStore());

        const activeGoals = result.current.getActiveGoals();

        expect(activeGoals).toHaveLength(2);
        expect(activeGoals.every((g) => g.status === 'active')).toBe(true);
      });
    });

    describe('getCompletedGoals', () => {
      it('should return only completed goals', () => {
        const { result } = renderHook(() => useGoalsStore());

        const completedGoals = result.current.getCompletedGoals();

        expect(completedGoals).toHaveLength(1);
        expect(completedGoals[0].status).toBe('completed');
      });
    });

    describe('getGoalById', () => {
      it('should return goal by id', () => {
        const { result } = renderHook(() => useGoalsStore());

        const goal = result.current.getGoalById(mockGoal.id);

        expect(goal).toEqual(mockGoal);
      });

      it('should return undefined for non-existent goal', () => {
        const { result } = renderHook(() => useGoalsStore());

        const goal = result.current.getGoalById('non-existent-id');

        expect(goal).toBeUndefined();
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useGoalsStore());

      act(() => {
        result.current.error = 'Some error';
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
