import { ProgressService } from '../progress.service';
import { GoalWithRelations, GoalMilestone, GoalTask } from '../../types/goals';

describe('ProgressService', () => {
  const service = new ProgressService();

  describe('calculateProgress', () => {
    describe('Manual progress type', () => {
      it('should return stored progress_value for manual goals', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Manual Goal',
          description: null,
          status: 'active',
          progress_type: 'manual',
          progress_value: 75,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(75);
      });

      it('should return 0 for manual goal with 0 progress', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Manual Goal',
          description: null,
          status: 'active',
          progress_type: 'manual',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(0);
      });

      it('should return 100 for manual goal with 100 progress', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Manual Goal',
          description: null,
          status: 'active',
          progress_type: 'manual',
          progress_value: 100,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(100);
      });
    });

    describe('Task-based progress type', () => {
      it('should calculate progress based on completed/total linked tasks', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Task-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'task_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        // Mock goal_tasks with 2 completed out of 4 total tasks
        const mockGoalTasks: GoalTask[] = [
          { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-2', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-3', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-4', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
        ];

        // Mock tasks: task-1 and task-2 are done, task-3 and task-4 are not
        const mockTasks = [
          { id: 'task-1', status: 'done' },
          { id: 'task-2', status: 'done' },
          { id: 'task-3', status: 'todo' },
          { id: 'task-4', status: 'doing' },
        ];

        const result = await service.calculateProgress(goal, mockGoalTasks, mockTasks);
        expect(result).toBe(50); // 2 completed / 4 total = 50%
      });

      it('should return 0 when no tasks are linked', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Task-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'task_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const result = await service.calculateProgress(goal, [], []);
        expect(result).toBe(0);
      });

      it('should return 100 when all tasks are completed', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Task-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'task_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const mockGoalTasks: GoalTask[] = [
          { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-2', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
        ];

        const mockTasks = [
          { id: 'task-1', status: 'done' },
          { id: 'task-2', status: 'done' },
        ];

        const result = await service.calculateProgress(goal, mockGoalTasks, mockTasks);
        expect(result).toBe(100);
      });

      it('should handle weighted task calculation correctly', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Task-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'task_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        // Task 1: weight 3, completed
        // Task 2: weight 2, not completed
        // Task 3: weight 5, completed
        // Total weight: 10
        // Completed weight: 3 + 5 = 8
        // Progress: 8/10 = 80%
        const mockGoalTasks: GoalTask[] = [
          { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 3, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-2', contribution_weight: 2, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-3', contribution_weight: 5, created_at: '2026-01-01T00:00:00Z' },
        ];

        const mockTasks = [
          { id: 'task-1', status: 'done' },
          { id: 'task-2', status: 'todo' },
          { id: 'task-3', status: 'done' },
        ];

        const result = await service.calculateProgress(goal, mockGoalTasks, mockTasks);
        expect(result).toBe(80);
      });

      it('should round progress to nearest integer', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Task-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'task_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        // 1 completed out of 3 tasks = 33.33%, should round to 33
        const mockGoalTasks: GoalTask[] = [
          { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-2', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
          { goal_id: 'goal-1', task_id: 'task-3', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
        ];

        const mockTasks = [
          { id: 'task-1', status: 'done' },
          { id: 'task-2', status: 'todo' },
          { id: 'task-3', status: 'todo' },
        ];

        const result = await service.calculateProgress(goal, mockGoalTasks, mockTasks);
        expect(result).toBe(33);
      });
    });

    describe('Milestone-based progress type', () => {
      it('should calculate progress based on completed/total milestones', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Milestone-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'milestone_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
          milestones: [
            {
              id: 'milestone-1',
              goal_id: 'goal-1',
              title: 'Milestone 1',
              is_complete: true,
              display_order: 0,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: '2026-01-02T00:00:00Z',
            },
            {
              id: 'milestone-2',
              goal_id: 'goal-1',
              title: 'Milestone 2',
              is_complete: true,
              display_order: 1,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: '2026-01-03T00:00:00Z',
            },
            {
              id: 'milestone-3',
              goal_id: 'goal-1',
              title: 'Milestone 3',
              is_complete: false,
              display_order: 2,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: null,
            },
            {
              id: 'milestone-4',
              goal_id: 'goal-1',
              title: 'Milestone 4',
              is_complete: false,
              display_order: 3,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: null,
            },
          ],
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(50); // 2 completed / 4 total = 50%
      });

      it('should return 0 when no milestones exist', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Milestone-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'milestone_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
          milestones: [],
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(0);
      });

      it('should return 100 when all milestones are completed', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Milestone-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'milestone_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
          milestones: [
            {
              id: 'milestone-1',
              goal_id: 'goal-1',
              title: 'Milestone 1',
              is_complete: true,
              display_order: 0,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: '2026-01-02T00:00:00Z',
            },
            {
              id: 'milestone-2',
              goal_id: 'goal-1',
              title: 'Milestone 2',
              is_complete: true,
              display_order: 1,
              created_at: '2026-01-01T00:00:00Z',
              completed_at: '2026-01-03T00:00:00Z',
            },
          ],
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(100);
      });

      it('should handle undefined milestones array', async () => {
        const goal: GoalWithRelations = {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Milestone-Based Goal',
          description: null,
          status: 'active',
          progress_type: 'milestone_based',
          progress_value: 0,
          target_date: null,
          category_id: null,
          color: null,
          icon: null,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        };

        const result = await service.calculateProgress(goal);
        expect(result).toBe(0);
      });
    });
  });
});
