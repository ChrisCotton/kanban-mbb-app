import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Goal, CreateGoalInput, UpdateGoalInput, GoalFilters, GoalSortOptions } from '../types/goals';
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
              user_id: user.id,
              ...input,
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
              user_id: user.id,
              ...input,
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
