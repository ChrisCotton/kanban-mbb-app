import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Goal,
  GoalWithRelations,
  CreateGoalInput,
  UpdateGoalInput,
  GoalFilters,
  GoalSortOptions,
  GoalMilestone,
} from '../types/goals';
import { supabase } from '../../lib/supabase';

interface GoalsState {
  goals: Goal[];
  activeGoalFilter: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchGoals: (filters?: GoalFilters, sort?: GoalSortOptions) => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<Goal>;
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  completeGoal: (id: string) => Promise<Goal>;
  setActiveGoalFilter: (goalId: string | null) => void;
  reorderGoals: (goalIds: string[]) => Promise<void>;
  createMilestone: (goalId: string, title: string) => Promise<GoalMilestone>;
  updateMilestone: (
    goalId: string,
    milestoneId: string,
    updates: Partial<GoalMilestone>
  ) => Promise<GoalMilestone>;
  deleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  toggleMilestone: (
    goalId: string,
    milestoneId: string,
    isComplete: boolean
  ) => Promise<GoalMilestone>;
  reorderMilestones: (goalId: string, milestoneIds: string[]) => Promise<void>;
  clearError: () => void;

  // Selectors
  getActiveGoals: () => Goal[];
  getCompletedGoals: () => Goal[];
  getGoalById: (id: string) => Goal | undefined;
}

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Failed to get auth session:', error);
  }

  return headers;
};

const buildQueryString = (filters?: GoalFilters, sort?: GoalSortOptions, userId?: string): string => {
  const params = new URLSearchParams();

  if (userId) {
    params.append('user_id', userId);
  }

  if (filters) {
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        params.append('status', filters.status.join(','));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.category_id) {
      params.append('category_id', filters.category_id);
    }
    if (filters.has_target_date !== undefined) {
      params.append('has_target_date', filters.has_target_date.toString());
    }
    if (filters.overdue) {
      params.append('overdue', 'true');
    }
  }

  if (sort) {
    params.append('sort_field', sort.field);
    params.append('sort_direction', sort.direction);
  }

  return params.toString();
};

export const useGoalsStore = create<GoalsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      goals: [],
      activeGoalFilter: null,
      isLoading: false,
      error: null,

      // Fetch goals
      fetchGoals: async (filters?: GoalFilters, sort?: GoalSortOptions) => {
        set({ isLoading: true, error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const queryString = buildQueryString(filters, sort, user.id);
          const url = `/api/goals${queryString ? `?${queryString}` : ''}`;
          const headers = await getAuthHeaders();

          const response = await fetch(url, { headers });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch goals');
          }

          set({
            goals: result.data || [],
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch goals';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Create goal
      createGoal: async (input: CreateGoalInput): Promise<Goal> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const headers = await getAuthHeaders();
          const response = await fetch('/api/goals', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...input,
              // Must come after spread so a stray `user_id` on input cannot override the session user
              user_id: user.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to create goal');
          }

          const newGoal = result.data as Goal;

          // Optimistically add to store
          set((state) => ({
            goals: [...state.goals, newGoal],
            error: null,
          }));

          return newGoal;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create goal';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Update goal
      updateGoal: async (id: string, input: UpdateGoalInput): Promise<Goal> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              ...input,
              user_id: user.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to update goal');
          }

          const updatedGoal = result.data as Goal;

          // Optimistically update in store
          set((state) => ({
            goals: state.goals.map((goal) => (goal.id === id ? updatedGoal : goal)),
            error: null,
          }));

          return updatedGoal;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update goal';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Delete goal (archive)
      deleteGoal: async (id: string): Promise<void> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${id}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
              user_id: user.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to delete goal');
          }

          const archivedGoal = result.data as Goal;

          // Optimistically update in store
          set((state) => ({
            goals: state.goals.map((goal) => (goal.id === id ? archivedGoal : goal)),
            error: null,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete goal';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Complete goal
      completeGoal: async (id: string): Promise<Goal> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${id}/complete`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: user.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to complete goal');
          }

          const completedGoal = result.data as Goal;

          // Optimistically update in store
          set((state) => ({
            goals: state.goals.map((goal) => (goal.id === id ? completedGoal : goal)),
            error: null,
          }));

          return completedGoal;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to complete goal';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Set active goal filter
      setActiveGoalFilter: (goalId: string | null) => {
        set({ activeGoalFilter: goalId });
      },

      // Reorder goals
      reorderGoals: async (goalIds: string[]): Promise<void> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Optimistically update display_order
          set((state) => ({
            goals: state.goals.map((goal) => {
              const index = goalIds.indexOf(goal.id);
              if (index !== -1) {
                return { ...goal, display_order: index };
              }
              return goal;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch('/api/goals/reorder', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              goal_ids: goalIds,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to reorder goals');
          }

          set({ error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reorder goals';
          set({ error: errorMessage });
          // Revert optimistic update on error
          const { fetchGoals } = get();
          fetchGoals().catch(() => {
            // Ignore refetch errors
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Create milestone
      createMilestone: async (goalId: string, title: string): Promise<GoalMilestone> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const goal = get().getGoalById(goalId) as GoalWithRelations | undefined;
          if (!goal) {
            throw new Error('Goal not found');
          }

          // Optimistically add milestone to goal
          const optimisticMilestone: GoalMilestone = {
            id: `temp-${Date.now()}`,
            goal_id: goalId,
            title,
            is_complete: false,
            display_order: (goal.milestones?.length || 0),
            created_at: new Date().toISOString(),
            completed_at: null,
          };

          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: [...(goalWithRelations.milestones || []), optimisticMilestone],
                };
              }
              return g;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${goalId}/milestones`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              title,
            }),
          });

          if (!response.ok) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.filter((m) => m.id !== optimisticMilestone.id) || [],
                  };
                }
                return g;
              }),
            }));

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.filter((m) => m.id !== optimisticMilestone.id) || [],
                  };
                }
                return g;
              }),
            }));

            throw new Error(result.error || 'Failed to create milestone');
          }

          const newMilestone = result.data as GoalMilestone;

          // Replace optimistic milestone with real one
          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.map((m) =>
                    m.id === optimisticMilestone.id ? newMilestone : m
                  ) || [newMilestone],
                };
              }
              return g;
            }),
          }));

          // Refresh goal to get updated progress
          const refreshResponse = await fetch(`/api/goals/${goalId}?user_id=${user.id}`, { headers });
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              set((state) => ({
                goals: state.goals.map((g) => (g.id === goalId ? refreshResult.data : g)),
              }));
            }
          }

          return newMilestone;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create milestone';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Update milestone
      updateMilestone: async (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const goal = get().getGoalById(goalId) as GoalWithRelations | undefined;
          if (!goal) {
            throw new Error('Goal not found');
          }

          const milestone = goal.milestones?.find((m) => m.id === milestoneId);
          if (!milestone) {
            throw new Error('Milestone not found');
          }

          // Optimistically update milestone
          const optimisticUpdate = { ...milestone, ...updates };

          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.map((m) =>
                    m.id === milestoneId ? optimisticUpdate : m
                  ) || [],
                };
              }
              return g;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${goalId}/milestones/${milestoneId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              ...updates,
            }),
          });

          if (!response.ok) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.map((m) =>
                      m.id === milestoneId ? milestone : m
                    ) || [],
                  };
                }
                return g;
              }),
            }));

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.map((m) =>
                      m.id === milestoneId ? milestone : m
                    ) || [],
                  };
                }
                return g;
              }),
            }));

            throw new Error(result.error || 'Failed to update milestone');
          }

          const updatedMilestone = result.data as GoalMilestone;

          // Update with real milestone
          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.map((m) =>
                    m.id === milestoneId ? updatedMilestone : m
                  ) || [],
                };
              }
              return g;
            }),
          }));

          // Refresh goal to get updated progress
          const refreshResponse = await fetch(`/api/goals/${goalId}?user_id=${user.id}`, { headers });
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              set((state) => ({
                goals: state.goals.map((g) => (g.id === goalId ? refreshResult.data : g)),
              }));
            }
          }

          return updatedMilestone;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update milestone';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Delete milestone
      deleteMilestone: async (goalId: string, milestoneId: string): Promise<void> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const goal = get().getGoalById(goalId) as GoalWithRelations | undefined;
          if (!goal) {
            throw new Error('Goal not found');
          }

          const milestone = goal.milestones?.find((m) => m.id === milestoneId);
          if (!milestone) {
            throw new Error('Milestone not found');
          }

          // Optimistically remove milestone
          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.filter((m) => m.id !== milestoneId) || [],
                };
              }
              return g;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${goalId}/milestones/${milestoneId}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
              user_id: user.id,
            }),
          });

          if (!response.ok) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: [...(goalWithRelations.milestones || []), milestone],
                  };
                }
                return g;
              }),
            }));

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: [...(goalWithRelations.milestones || []), milestone],
                  };
                }
                return g;
              }),
            }));

            throw new Error(result.error || 'Failed to delete milestone');
          }

          // Refresh goal to get updated progress
          const refreshResponse = await fetch(`/api/goals/${goalId}?user_id=${user.id}`, { headers });
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              set((state) => ({
                goals: state.goals.map((g) => (g.id === goalId ? refreshResult.data : g)),
              }));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete milestone';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Toggle milestone
      toggleMilestone: async (goalId: string, milestoneId: string, isComplete: boolean): Promise<GoalMilestone> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const goal = get().getGoalById(goalId) as GoalWithRelations | undefined;
          if (!goal) {
            throw new Error('Goal not found');
          }

          const milestone = goal.milestones?.find((m) => m.id === milestoneId);
          if (!milestone) {
            throw new Error('Milestone not found');
          }

          // Optimistically update milestone
          const optimisticUpdate: GoalMilestone = {
            ...milestone,
            is_complete: isComplete,
            completed_at: isComplete ? new Date().toISOString() : null,
          };

          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.map((m) =>
                    m.id === milestoneId ? optimisticUpdate : m
                  ) || [],
                };
              }
              return g;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${goalId}/milestones/${milestoneId}/toggle`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              is_complete: isComplete,
            }),
          });

          if (!response.ok) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.map((m) =>
                      m.id === milestoneId ? milestone : m
                    ) || [],
                  };
                }
                return g;
              }),
            }));

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: goalWithRelations.milestones?.map((m) =>
                      m.id === milestoneId ? milestone : m
                    ) || [],
                  };
                }
                return g;
              }),
            }));

            throw new Error(result.error || 'Failed to toggle milestone');
          }

          const toggledMilestone = result.data as GoalMilestone;

          // Update with real milestone
          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: goalWithRelations.milestones?.map((m) =>
                    m.id === milestoneId ? toggledMilestone : m
                  ) || [],
                };
              }
              return g;
            }),
          }));

          // Refresh goal to get updated progress
          const refreshResponse = await fetch(`/api/goals/${goalId}?user_id=${user.id}`, { headers });
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              set((state) => ({
                goals: state.goals.map((g) => (g.id === goalId ? refreshResult.data : g)),
              }));
            }
          }

          return toggledMilestone;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to toggle milestone';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Reorder milestones
      reorderMilestones: async (goalId: string, milestoneIds: string[]): Promise<void> => {
        set({ error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const goal = get().getGoalById(goalId) as GoalWithRelations | undefined;
          if (!goal) {
            throw new Error('Goal not found');
          }

          const milestones = goal.milestones || [];
          if (milestones.length === 0) {
            throw new Error('Goal has no milestones');
          }

          const initialMilestones = [...milestones];

          // Validate all milestone IDs exist
          const milestoneMap = new Map(milestones.map((m) => [m.id, m]));
          const missingIds = milestoneIds.filter((id) => !milestoneMap.has(id));
          if (missingIds.length > 0) {
            throw new Error(`Milestones not found: ${missingIds.join(', ')}`);
          }

          const reorderedMilestones = milestoneIds.map((id, index) => {
            const milestone = milestoneMap.get(id)!;
            return { ...milestone, display_order: index };
          });

          // Optimistically update display_order
          set((state) => ({
            goals: state.goals.map((g) => {
              if (g.id === goalId) {
                const goalWithRelations = g as GoalWithRelations;
                return {
                  ...goalWithRelations,
                  milestones: reorderedMilestones,
                };
              }
              return g;
            }),
          }));

          const headers = await getAuthHeaders();
          const response = await fetch(`/api/goals/${goalId}/milestones/reorder`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              milestone_ids: milestoneIds,
            }),
          });

          if (!response.ok) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: initialMilestones,
                  };
                }
                return g;
              }),
            }));

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            // Revert optimistic update
            set((state) => ({
              goals: state.goals.map((g) => {
                if (g.id === goalId) {
                  const goalWithRelations = g as GoalWithRelations;
                  return {
                    ...goalWithRelations,
                    milestones: initialMilestones,
                  };
                }
                return g;
              }),
            }));

            throw new Error(result.error || 'Failed to reorder milestones');
          }

          // Refresh goal to get updated progress
          const refreshResponse = await fetch(`/api/goals/${goalId}?user_id=${user.id}`, { headers });
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              set((state) => ({
                goals: state.goals.map((g) => (g.id === goalId ? refreshResult.data : g)),
              }));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reorder milestones';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Selectors
      getActiveGoals: () => {
        return get().goals.filter((goal) => goal.status === 'active');
      },

      getCompletedGoals: () => {
        return get().goals.filter((goal) => goal.status === 'completed');
      },

      getGoalById: (id: string) => {
        return get().goals.find((goal) => goal.id === id);
      },
    }),
    {
      name: 'goals-store',
    }
  )
);
