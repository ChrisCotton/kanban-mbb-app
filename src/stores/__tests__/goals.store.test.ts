import { act, renderHook } from '@testing-library/react';
import { useGoalsStore } from '../goals.store';
import { Goal, CreateGoalInput, UpdateGoalInput, GoalFilters, GoalSortOptions, GoalMilestone, GoalWithRelations } from '../../types/goals';
import { mockGoal, mockGoalMinimal, mockGoalCompleted, mockCreateGoalInput, TEST_USER_ID, mockMilestone, mockMilestoneCompleted, mockMilestonesList } from '../../test/fixtures/goals';

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
    act(() => {
      useGoalsStore.setState({
        goals: [],
        isLoading: false,
        error: null,
        activeGoalFilter: null,
      });
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

  describe('Milestone Actions', () => {
    const mockGoalWithMilestones: GoalWithRelations = {
      ...mockGoal,
      milestones: [mockMilestone],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      act(() => {
        useGoalsStore.setState({
          goals: [{ ...mockGoalWithMilestones }],
          isLoading: false,
          error: null,
          activeGoalFilter: null,
        });
      });
    });

    describe('createMilestone', () => {
      it('should create milestone and optimistically update goal', async () => {
        const newMilestone: GoalMilestone = {
          id: 'milestone-uuid-new',
          goal_id: mockGoal.id,
          title: 'New Milestone',
          is_complete: false,
          display_order: 2,
          created_at: '2026-01-26T10:00:00.000Z',
          completed_at: null,
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: newMilestone,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: { ...mockGoalWithMilestones, milestones: [mockMilestone, newMilestone] },
            }),
          });

        const { result } = renderHook(() => useGoalsStore());

        let created: GoalMilestone;
        await act(async () => {
          created = await result.current.createMilestone(mockGoal.id, 'New Milestone');
        });

        expect(created!).toEqual(newMilestone);
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toContainEqual(newMilestone);
      });

      it('should handle creation errors and revert optimistic update', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Title is required',
          }),
        });

        const { result } = renderHook(() => useGoalsStore());
        const initialMilestones = (result.current.getGoalById(mockGoal.id) as GoalWithRelations)?.milestones || [];

        await act(async () => {
          try {
            await result.current.createMilestone(mockGoal.id, '');
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeTruthy();
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toEqual(initialMilestones);
      });
    });

    describe('updateMilestone', () => {
      it('should update milestone and optimistically update goal', async () => {
        const updatedMilestone: GoalMilestone = {
          ...mockMilestone,
          title: 'Updated Milestone Title',
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: updatedMilestone,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: { ...mockGoalWithMilestones, milestones: [updatedMilestone] },
            }),
          });

        const { result } = renderHook(() => useGoalsStore());

        let updated: GoalMilestone;
        await act(async () => {
          updated = await result.current.updateMilestone(mockGoal.id, mockMilestone.id, { title: 'Updated Milestone Title' });
        });

        expect(updated!).toEqual(updatedMilestone);
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones?.find((m) => m.id === mockMilestone.id)?.title).toBe('Updated Milestone Title');
      });

      it('should handle update errors and revert optimistic update', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            error: 'Milestone not found',
          }),
        });

        const { result } = renderHook(() => useGoalsStore());
        const initialMilestones = (result.current.getGoalById(mockGoal.id) as GoalWithRelations)?.milestones || [];

        await act(async () => {
          try {
            await result.current.updateMilestone(mockGoal.id, 'fake-id', { title: 'Updated' });
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeTruthy();
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toEqual(initialMilestones);
      });
    });

    describe('deleteMilestone', () => {
      it('should delete milestone and optimistically update goal', async () => {
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: { ...mockGoalWithMilestones, milestones: [] },
            }),
          });

        const { result } = renderHook(() => useGoalsStore());

        await act(async () => {
          await result.current.deleteMilestone(mockGoal.id, mockMilestone.id);
        });

        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones?.find((m) => m.id === mockMilestone.id)).toBeUndefined();
      });

      it('should handle delete errors and revert optimistic update', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            error: 'Milestone not found',
          }),
        });

        const { result } = renderHook(() => useGoalsStore());
        const initialMilestones = (result.current.getGoalById(mockGoal.id) as GoalWithRelations)?.milestones || [];

        await act(async () => {
          try {
            await result.current.deleteMilestone(mockGoal.id, 'fake-id');
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeTruthy();
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toEqual(initialMilestones);
      });
    });

    describe('toggleMilestone', () => {
      it('should toggle milestone completion and optimistically update goal', async () => {
        const toggledMilestone: GoalMilestone = {
          ...mockMilestone,
          is_complete: true,
          completed_at: '2026-01-26T10:00:00.000Z',
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: toggledMilestone,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: { ...mockGoalWithMilestones, milestones: [toggledMilestone] },
            }),
          });

        const { result } = renderHook(() => useGoalsStore());

        let toggled: GoalMilestone;
        await act(async () => {
          toggled = await result.current.toggleMilestone(mockGoal.id, mockMilestone.id, true);
        });

        expect(toggled!).toEqual(toggledMilestone);
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones?.find((m) => m.id === mockMilestone.id)?.is_complete).toBe(true);
      });

      it('should handle toggle errors and revert optimistic update', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            error: 'Milestone not found',
          }),
        });

        const { result } = renderHook(() => useGoalsStore());
        const initialMilestones = (result.current.getGoalById(mockGoal.id) as GoalWithRelations)?.milestones || [];

        await act(async () => {
          try {
            await result.current.toggleMilestone(mockGoal.id, 'fake-id', true);
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeTruthy();
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toEqual(initialMilestones);
      });
    });

    describe('reorderMilestones', () => {
      it('should reorder milestones and optimistically update goal', async () => {
        const milestones = [
          { ...mockMilestone, id: 'milestone-1', display_order: 0 },
          { ...mockMilestoneCompleted, id: 'milestone-2', display_order: 1 },
        ];
        const goalWithMultipleMilestones: GoalWithRelations = {
          ...mockGoal,
          milestones,
        };

        act(() => {
          useGoalsStore.setState({ goals: [goalWithMultipleMilestones] });
        });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                ...goalWithMultipleMilestones,
                milestones: [
                  { ...milestones[1], display_order: 0 },
                  { ...milestones[0], display_order: 1 },
                ],
              },
            }),
          });

        const { result } = renderHook(() => useGoalsStore());

        await act(async () => {
          await result.current.reorderMilestones(mockGoal.id, ['milestone-2', 'milestone-1']);
        });

        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones?.[0].id).toBe('milestone-2');
        expect(goal.milestones?.[1].id).toBe('milestone-1');
      });

      it('should handle reorder errors and revert optimistic update', async () => {
        const milestones = [
          { ...mockMilestone, id: 'milestone-1', display_order: 0 },
          { ...mockMilestoneCompleted, id: 'milestone-2', display_order: 1 },
        ];
        const goalWithMultipleMilestones: GoalWithRelations = {
          ...mockGoal,
          milestones,
        };

        act(() => {
          useGoalsStore.setState({ goals: [goalWithMultipleMilestones] });
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Invalid milestone IDs',
          }),
        });

        const { result } = renderHook(() => useGoalsStore());
        const initialMilestones = (result.current.getGoalById(mockGoal.id) as GoalWithRelations)?.milestones || [];

        await act(async () => {
          try {
            await result.current.reorderMilestones(mockGoal.id, ['invalid-id']);
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeTruthy();
        const goal = result.current.getGoalById(mockGoal.id) as GoalWithRelations;
        expect(goal.milestones).toEqual(initialMilestones);
      });
    });
  });
});
