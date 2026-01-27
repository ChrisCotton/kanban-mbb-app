import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Goal, 
  GoalWithRelations,
  CreateGoalInput, 
  UpdateGoalInput, 
  GoalFilters, 
  GoalSortOptions,
  GoalTask
} from '../types/goals';

export interface GetGoalsResult {
  goals: GoalWithRelations[];
  count?: number;
}

export class GoalsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get current authenticated user ID
   * If providedUserId is provided, use it; otherwise try to get from auth
   */
  private async getCurrentUserId(providedUserId?: string): Promise<string> {
    if (providedUserId) {
      return providedUserId;
    }
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Validate goal title
   */
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (title.length > 255) {
      throw new Error('Title must be 255 characters or less');
    }
  }

  /**
   * Validate progress value
   */
  private validateProgress(progress: number | undefined): void {
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      throw new Error('Progress value must be between 0 and 100');
    }
  }

  /**
   * Get all goals for the current user with optional filters and sorting
   */
  async getGoals(filters?: GoalFilters, sort?: GoalSortOptions, userId?: string): Promise<GetGoalsResult> {
    const currentUserId = await this.getCurrentUserId(userId);
    
    let query = this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUserId);

    // Apply filters
    if (filters) {
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.has_target_date !== undefined) {
        if (filters.has_target_date) {
          query = query.not('target_date', 'is', null);
        } else {
          query = query.is('target_date', null);
        }
      }

      if (filters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('target_date', today).neq('status', 'completed');
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      // Default sort by display_order
      query = query.order('display_order', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch goals');
    }

    const goals = data || [];

    // Fetch vision board images for all goals
    if (goals.length > 0) {
      const goalIds = goals.map(g => g.id);
      
      // Fetch vision image links
      const { data: visionLinks, error: linksError } = await this.supabase
        .from('goal_vision_images')
        .select('goal_id, vision_image_id')
        .in('goal_id', goalIds);

      if (!linksError && visionLinks && visionLinks.length > 0) {
        // Get unique vision image IDs
        const visionImageIds = [...new Set(visionLinks.map(link => link.vision_image_id))];
        
        // Fetch vision board images
        const { data: visionImages, error: imagesError } = await this.supabase
          .from('vision_board_images')
          .select('id, file_path')
          .in('id', visionImageIds);

        if (!imagesError && visionImages) {
          // Create a map of goal_id to vision images
          const goalVisionMap = new Map<string, typeof visionImages>();
          
          visionLinks.forEach(link => {
            const image = visionImages.find(img => img.id === link.vision_image_id);
            if (image) {
              if (!goalVisionMap.has(link.goal_id)) {
                goalVisionMap.set(link.goal_id, []);
              }
              goalVisionMap.get(link.goal_id)!.push(image);
            }
          });

          // Add vision_images to each goal
          goals.forEach(goal => {
            const images = goalVisionMap.get(goal.id) || [];
            (goal as any).vision_images = images.map(img => ({
              id: img.id,
              url: img.file_path,
              thumbnail_url: img.file_path, // Use same URL for thumbnail
            }));
          });
        }
      }
    }

    return {
      goals: goals as GoalWithRelations[],
      count: goals.length,
    };
  }

  /**
   * Get a single goal by ID
   */
  async getGoalById(id: string, userId?: string): Promise<GoalWithRelations> {
    const currentUserId = await this.getCurrentUserId(userId);

    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', currentUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Goal not found');
      }
      throw new Error(error.message || 'Failed to fetch goal');
    }

    if (!data) {
      throw new Error('Goal not found');
    }

    const goal = data as Goal;

    // Fetch category if present
    if (goal.category_id) {
      const { data: category, error: categoryError } = await this.supabase
        .from('categories')
        .select('id, name, color')
        .eq('id', goal.category_id)
        .single();

      if (!categoryError && category) {
        (goal as any).category = category;
      } else {
        (goal as any).category = null;
      }
    } else {
      (goal as any).category = null;
    }

    // Fetch vision board images for this goal
    const { data: visionLinks, error: linksError } = await this.supabase
      .from('goal_vision_images')
      .select('vision_image_id')
      .eq('goal_id', id);

    if (!linksError && visionLinks && visionLinks.length > 0) {
      const visionImageIds = visionLinks.map(link => link.vision_image_id);
      
      const { data: visionImages, error: imagesError } = await this.supabase
        .from('vision_board_images')
        .select('id, file_path')
        .in('id', visionImageIds);

      if (!imagesError && visionImages) {
        (goal as any).vision_images = visionImages.map(img => ({
          id: img.id,
          url: img.file_path,
          thumbnail_url: img.file_path, // Use same URL for thumbnail
        }));
      } else {
        (goal as any).vision_images = [];
      }
    } else {
      (goal as any).vision_images = [];
    }

    return goal as GoalWithRelations;
  }

  /**
   * Create a new goal
   */
  async createGoal(input: CreateGoalInput, userId?: string): Promise<GoalWithRelations> {
    const currentUserId = await this.getCurrentUserId(userId);

    // Validate input
    this.validateTitle(input.title);
    this.validateProgress(input.progress_value);

    // Prepare goal data
    const goalData = {
      user_id: currentUserId,
      title: input.title.trim(),
      description: input.description || null,
      status: input.status || 'active',
      progress_type: input.progress_type || 'manual',
      progress_value: input.progress_value ?? 0,
      target_date: input.target_date || null,
      category_id: input.category_id || null,
      color: input.color || null,
      icon: input.icon || null,
      display_order: 0, // Will be set based on existing goals count
    };

    const { data, error } = await this.supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create goal');
    }

    const newGoal = data as Goal;

    // Create vision image links if provided
    if (input.vision_image_ids && input.vision_image_ids.length > 0) {
      const visionImageLinks = input.vision_image_ids.map(imageId => ({
        goal_id: newGoal.id,
        vision_image_id: imageId,
      }));

      const { error: linkError } = await this.supabase
        .from('goal_vision_images')
        .insert(visionImageLinks);

      if (linkError) {
        console.error('Error creating vision image links:', linkError);
        // Don't fail the goal creation, but log the error
      }
    }

    return newGoal;
  }

  /**
   * Update an existing goal
   */
  async updateGoal(id: string, input: UpdateGoalInput, userId?: string): Promise<GoalWithRelations> {
    const currentUserId = await this.getCurrentUserId(userId);

    // Validate input
    if (input.title !== undefined) {
      this.validateTitle(input.title);
    }
    this.validateProgress(input.progress_value);

    // Build update object with only provided fields
    const updateData: Partial<Goal> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.progress_type !== undefined) updateData.progress_type = input.progress_type;
    if (input.progress_value !== undefined) updateData.progress_value = input.progress_value;
    if (input.target_date !== undefined) updateData.target_date = input.target_date;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.display_order !== undefined) updateData.display_order = input.display_order;

    const { data, error } = await this.supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', currentUserId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Goal not found');
      }
      throw new Error(error.message || 'Failed to update goal');
    }

    if (!data) {
      throw new Error('Goal not found');
    }

    const updatedGoal = data as Goal;

    // Fetch category if present
    if (updatedGoal.category_id) {
      const { data: category, error: categoryError } = await this.supabase
        .from('categories')
        .select('id, name, color')
        .eq('id', updatedGoal.category_id)
        .single();

      if (!categoryError && category) {
        (updatedGoal as any).category = category;
      } else {
        (updatedGoal as any).category = null;
      }
    } else {
      (updatedGoal as any).category = null;
    }

    // Handle vision image links if provided
    if (input.vision_image_ids !== undefined) {
      // Delete existing links
      const { error: deleteError } = await this.supabase
        .from('goal_vision_images')
        .delete()
        .eq('goal_id', id);

      if (deleteError) {
        console.error('Error deleting existing vision image links:', deleteError);
      }

      // Create new links if any provided
      if (input.vision_image_ids.length > 0) {
        const visionImageLinks = input.vision_image_ids.map(imageId => ({
          goal_id: id,
          vision_image_id: imageId,
        }));

        const { error: linkError } = await this.supabase
          .from('goal_vision_images')
          .insert(visionImageLinks);

        if (linkError) {
          console.error('Error creating vision image links:', linkError);
        } else {
          // Fetch the vision images to include in response
          const { data: visionImages, error: imagesError } = await this.supabase
            .from('vision_board_images')
            .select('id, file_path')
            .in('id', input.vision_image_ids);

          if (!imagesError && visionImages) {
            (updatedGoal as any).vision_images = visionImages.map(img => ({
              id: img.id,
              url: img.file_path,
              thumbnail_url: img.file_path,
            }));
          } else {
            (updatedGoal as any).vision_images = [];
          }
        }
      } else {
        (updatedGoal as any).vision_images = [];
      }
    } else {
      // If vision_image_ids not provided, fetch existing ones
      const { data: visionLinks, error: linksError } = await this.supabase
        .from('goal_vision_images')
        .select('vision_image_id')
        .eq('goal_id', id);

      if (!linksError && visionLinks && visionLinks.length > 0) {
        const visionImageIds = visionLinks.map(link => link.vision_image_id);
        
        const { data: visionImages, error: imagesError } = await this.supabase
          .from('vision_board_images')
          .select('id, file_path')
          .in('id', visionImageIds);

        if (!imagesError && visionImages) {
          (updatedGoal as any).vision_images = visionImages.map(img => ({
            id: img.id,
            url: img.file_path,
            thumbnail_url: img.file_path,
          }));
        } else {
          (updatedGoal as any).vision_images = [];
        }
      } else {
        (updatedGoal as any).vision_images = [];
      }
    }

    return updatedGoal as GoalWithRelations;
  }

  /**
   * Delete (soft delete - archive) a goal
   */
  async deleteGoal(id: string, userId?: string): Promise<GoalWithRelations> {
    return this.updateGoal(id, { status: 'archived' }, userId);
  }

  /**
   * Mark a goal as completed
   */
  async completeGoal(id: string, userId?: string): Promise<GoalWithRelations> {
    const currentUserId = await this.getCurrentUserId(userId);

    const updateData = {
      status: 'completed' as const,
      progress_value: 100,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', currentUserId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Goal not found');
      }
      throw new Error(error.message || 'Failed to complete goal');
    }

    if (!data) {
      throw new Error('Goal not found');
    }

    // Use updateGoal to get full relations (category, vision_images)
    return this.updateGoal(id, {}, userId);
  }

  /**
   * Reorder goals by updating their display_order
   */
  async reorderGoals(goalIds: string[], userId?: string): Promise<void> {
    const currentUserId = await this.getCurrentUserId(userId);

    // Update each goal's display_order based on its position in the array
    const updatePromises = goalIds.map((goalId, index) => {
      return this.supabase
        .from('goals')
        .update({ display_order: index })
        .eq('id', goalId)
        .eq('user_id', currentUserId);
    });

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.error?.message).filter(Boolean);
      throw new Error(`Failed to reorder goals: ${errorMessages.join(', ')}`);
    }
  }

  /**
   * Get all tasks linked to a goal
   */
  async getGoalTasks(goalId: string, userId?: string): Promise<any[]> {
    const currentUserId = await this.getCurrentUserId(userId);

    const { data, error } = await this.supabase
      .from('goal_tasks')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('goal_id', goalId)
      .eq('task.user_id', currentUserId);

    if (error) {
      throw new Error(error.message || 'Failed to fetch goal tasks');
    }

    return data || [];
  }

  /**
   * Link a task to a goal
   */
  async addGoalTask(
    goalId: string,
    taskId: string,
    contributionWeight: number = 1,
    userId?: string
  ): Promise<GoalTask> {
    await this.getCurrentUserId(userId);

    // Validate contribution weight
    if (contributionWeight < 1 || contributionWeight > 10) {
      throw new Error('contribution_weight must be between 1 and 10');
    }

    const { data, error } = await this.supabase
      .from('goal_tasks')
      .insert({
        goal_id: goalId,
        task_id: taskId,
        contribution_weight: contributionWeight,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Task is already linked to this goal');
      }
      throw new Error(error.message || 'Failed to link task to goal');
    }

    if (!data) {
      throw new Error('Failed to link task to goal');
    }

    return data as GoalTask;
  }

  /**
   * Unlink a task from a goal
   */
  async removeGoalTask(goalId: string, taskId: string, userId?: string): Promise<void> {
    await this.getCurrentUserId(userId);

    const { data, error } = await this.supabase
      .from('goal_tasks')
      .delete()
      .eq('goal_id', goalId)
      .eq('task_id', taskId)
      .select();

    if (error) {
      throw new Error(error.message || 'Failed to unlink task from goal');
    }

    if (!data || data.length === 0) {
      throw new Error('Task is not linked to this goal');
    }
  }

  /**
   * Get all goals linked to a task
   */
  async getTaskGoals(taskId: string, userId?: string): Promise<GoalTask[]> {
    const currentUserId = await this.getCurrentUserId(userId);

    // First get all goal_tasks for this task
    const { data: goalTasks, error: goalTasksError } = await this.supabase
      .from('goal_tasks')
      .select('*')
      .eq('task_id', taskId);

    if (goalTasksError) {
      throw new Error(goalTasksError.message || 'Failed to fetch task goals');
    }

    if (!goalTasks || goalTasks.length === 0) {
      return [];
    }

    // Get goal IDs and fetch goals to verify user ownership
    const goalIds = goalTasks.map((gt) => gt.goal_id);
    const { data: goals, error: goalsError } = await this.supabase
      .from('goals')
      .select('*')
      .in('id', goalIds)
      .eq('user_id', currentUserId);

    if (goalsError) {
      throw new Error(goalsError.message || 'Failed to fetch goals');
    }

    // Filter goal_tasks to only include goals owned by user
    const userGoalIds = new Set((goals || []).map((g) => g.id));
    const filteredGoalTasks = goalTasks.filter((gt) => userGoalIds.has(gt.goal_id));

    return filteredGoalTasks as GoalTask[];
  }

  /**
   * Link a task to a goal (alias for addGoalTask for consistency)
   */
  async linkTaskToGoal(
    goalId: string,
    taskId: string,
    contributionWeight: number = 1,
    userId?: string
  ): Promise<GoalTask> {
    return this.addGoalTask(goalId, taskId, contributionWeight, userId);
  }

  /**
   * Unlink a task from a goal (alias for removeGoalTask for consistency)
   */
  async unlinkTaskFromGoal(goalId: string, taskId: string, userId?: string): Promise<void> {
    return this.removeGoalTask(goalId, taskId, userId);
  }
}
