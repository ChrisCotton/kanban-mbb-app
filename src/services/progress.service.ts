import { GoalWithRelations, GoalTask, GoalMilestone } from '../types/goals';
import { SupabaseClient } from '@supabase/supabase-js';

interface Task {
  id: string;
  status: 'backlog' | 'todo' | 'doing' | 'done';
}

export class ProgressService {
  /**
   * Calculate progress for a goal based on its progress_type
   * @param goal - The goal with relations
   * @param goalTasks - Optional array of goal_tasks (required for task_based progress)
   * @param tasks - Optional array of tasks (required for task_based progress)
   * @returns Progress percentage (0-100)
   */
  async calculateProgress(
    goal: GoalWithRelations,
    goalTasks?: GoalTask[],
    tasks?: Task[]
  ): Promise<number> {
    switch (goal.progress_type) {
      case 'manual':
        return Promise.resolve(this.calculateManualProgress(goal));
      
      case 'task_based':
        if (!goalTasks || !tasks) {
          throw new Error('goalTasks and tasks are required for task_based progress calculation');
        }
        return Promise.resolve(this.calculateTaskBasedProgress(goalTasks, tasks));
      
      case 'milestone_based':
        return Promise.resolve(this.calculateMilestoneBasedProgress(goal.milestones));
      
      default:
        throw new Error(`Unknown progress_type: ${goal.progress_type}`);
    }
  }

  /**
   * Calculate manual progress - simply return the stored value
   */
  private calculateManualProgress(goal: GoalWithRelations): number {
    return goal.progress_value;
  }

  /**
   * Calculate task-based progress
   * Supports both simple counting and weighted calculation
   */
  private calculateTaskBasedProgress(goalTasks: GoalTask[], tasks: Task[]): number {
    if (goalTasks.length === 0) {
      return 0;
    }

    // Create a map of task_id -> task for quick lookup
    const taskMap = new Map<string, Task>();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // Check if any tasks have weights (weight !== 1)
    const hasWeights = goalTasks.some(gt => gt.contribution_weight !== 1);

    if (hasWeights) {
      // Weighted calculation
      let totalWeight = 0;
      let completedWeight = 0;

      goalTasks.forEach(goalTask => {
        const task = taskMap.get(goalTask.task_id);
        if (!task) {
          // Task not found, skip it
          return;
        }

        const weight = goalTask.contribution_weight;
        totalWeight += weight;

        if (task.status === 'done') {
          completedWeight += weight;
        }
      });

      if (totalWeight === 0) {
        return 0;
      }

      const progress = Math.round((completedWeight / totalWeight) * 100);
      return Math.min(100, Math.max(0, progress));
    } else {
      // Simple counting
      let completedCount = 0;
      let totalCount = 0;

      goalTasks.forEach(goalTask => {
        const task = taskMap.get(goalTask.task_id);
        if (!task) {
          // Task not found, skip it
          return;
        }

        totalCount++;
        if (task.status === 'done') {
          completedCount++;
        }
      });

      if (totalCount === 0) {
        return 0;
      }

      const progress = Math.round((completedCount / totalCount) * 100);
      return Math.min(100, Math.max(0, progress));
    }
  }

  /**
   * Calculate milestone-based progress
   */
  private calculateMilestoneBasedProgress(milestones?: GoalMilestone[]): number {
    if (!milestones || milestones.length === 0) {
      return 0;
    }

    const completedCount = milestones.filter(m => m.is_complete).length;
    const totalCount = milestones.length;

    if (totalCount === 0) {
      return 0;
    }

    const progress = Math.round((completedCount / totalCount) * 100);
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Calculate progress by fetching data from database
   * Use this when you don't have goalTasks and tasks arrays available
   */
  async calculateProgressFromDatabase(
    goal: GoalWithRelations,
    supabase: SupabaseClient
  ): Promise<number> {
    switch (goal.progress_type) {
      case 'manual':
        return this.calculateManualProgress(goal);
      
      case 'task_based':
        // Fetch goal_tasks and tasks from database
        const { data: goalTasks, error: goalTasksError } = await supabase
          .from('goal_tasks')
          .select('*')
          .eq('goal_id', goal.id);

        if (goalTasksError) {
          throw new Error(`Failed to fetch goal tasks: ${goalTasksError.message}`);
        }

        if (!goalTasks || goalTasks.length === 0) {
          return 0;
        }

        // Fetch tasks
        const taskIds = goalTasks.map(gt => gt.task_id);
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, status')
          .in('id', taskIds);

        if (tasksError) {
          throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
        }

        return this.calculateTaskBasedProgress(goalTasks as GoalTask[], tasks as Task[]);
      
      case 'milestone_based':
        // Fetch milestones if not already included
        if (!goal.milestones) {
          const { data: milestones, error: milestonesError } = await supabase
            .from('goal_milestones')
            .select('*')
            .eq('goal_id', goal.id)
            .order('display_order', { ascending: true });

          if (milestonesError) {
            throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
          }

          return this.calculateMilestoneBasedProgress(milestones as GoalMilestone[]);
        }

        return this.calculateMilestoneBasedProgress(goal.milestones);
      
      default:
        throw new Error(`Unknown progress_type: ${goal.progress_type}`);
    }
  }
}
