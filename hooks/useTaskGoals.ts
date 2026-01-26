import { useState, useEffect, useCallback } from 'react';
import { GoalTask } from '../src/types/goals';
import { supabase } from '../lib/supabase';

export function useTaskGoals(taskId: string | null) {
  const [linkedGoals, setLinkedGoals] = useState<GoalTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskGoals = useCallback(async () => {
    if (!taskId) {
      setLinkedGoals([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Fetch goals linked to this task
      const response = await fetch(`/api/tasks/${taskId}/goals`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task goals');
      }

      const result = await response.json();
      if (result.success) {
        setLinkedGoals(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch task goals');
      }
    } catch (err) {
      console.error('Error fetching task goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task goals');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskGoals();
  }, [fetchTaskGoals]);

  return {
    linkedGoals,
    isLoading,
    error,
    refetch: fetchTaskGoals,
  };
}
