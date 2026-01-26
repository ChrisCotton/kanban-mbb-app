import React, { useState, useEffect } from 'react';
import { Task } from '../../lib/database/kanban-queries';
import { Goal, GoalTask } from '../../src/types/goals';
import { useGoalsStore } from '../../src/stores/goals.store';
import { supabase } from '../../lib/supabase';

interface TaskGoalLinkProps {
  task: Task;
  linkedGoals: GoalTask[];
  onLinkChange?: () => void;
}

const TaskGoalLink: React.FC<TaskGoalLinkProps> = ({
  task,
  linkedGoals,
  onLinkChange,
}) => {
  const { goals, fetchGoals } = useGoalsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (goals.length === 0) {
      fetchGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals.length]);

  // Get linked goal IDs
  const linkedGoalIds = linkedGoals.map((lg) => lg.goal_id);

  // Filter out already linked goals
  const availableGoals = goals.filter((goal) => !linkedGoalIds.includes(goal.id));

  const handleLinkGoal = async (goalId: string) => {
    setIsLinking(true);
    setIsDropdownOpen(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/goals/${goalId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          task_id: task.id,
          contribution_weight: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link task to goal');
      }

      if (onLinkChange) {
        await onLinkChange();
      }
    } catch (error) {
      console.error('Error linking task to goal:', error);
      alert(error instanceof Error ? error.message : 'Failed to link task to goal');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGoal = async (goalId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/goals/${goalId}/tasks`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          task_id: task.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink task from goal');
      }

      onLinkChange?.();
    } catch (error) {
      console.error('Error unlinking task from goal:', error);
      alert(error instanceof Error ? error.message : 'Failed to unlink task from goal');
    }
  };

  // Get goal details for linked goals
  const linkedGoalsWithDetails = linkedGoals
    .map((lg) => {
      const goal = goals.find((g) => g.id === lg.goal_id);
      return goal ? { ...lg, goal } : null;
    })
    .filter((lg): lg is GoalTask & { goal: Goal } => lg !== null);

  return (
    <div className="mt-4" data-testid="task-goal-link">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Goals
        </h3>
        {availableGoals.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLinking}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
              data-testid="link-goal-button"
            >
              + Link
            </button>
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                data-testid="goal-selector-dropdown"
              >
                {availableGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => handleLinkGoal(goal.id)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {goal.icon || '🎯'} {goal.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {linkedGoalsWithDetails.length > 0 ? (
        <div className="space-y-2">
          {linkedGoalsWithDetails.map((linkedGoal) => (
            <div
              key={linkedGoal.goal_id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span>{linkedGoal.goal.icon || '🎯'}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {linkedGoal.goal.title}
                </span>
              </div>
              <button
                onClick={() => handleUnlinkGoal(linkedGoal.goal_id)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label={`Remove link to ${linkedGoal.goal.title}`}
                data-testid={`remove-goal-${linkedGoal.goal_id}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No goals linked
        </p>
      )}
    </div>
  );
};

export default TaskGoalLink;
