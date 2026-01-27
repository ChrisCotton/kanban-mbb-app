export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalProgressType = 'manual' | 'task_based' | 'milestone_based';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progress_type: GoalProgressType;
  progress_value: number;
  target_date: string | null;
  category_id: string | null;
  color: string | null;
  icon: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface GoalWithRelations extends Goal {
  category?: { id: string; name: string; color: string } | null;
  linked_tasks_count?: number;
  vision_images?: { id: string; url: string; thumbnail_url: string }[];
  milestones?: GoalMilestone[];
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  status?: GoalStatus;
  progress_type?: GoalProgressType;
  progress_value?: number;
  target_date?: string;
  category_id?: string;
  color?: string;
  icon?: string;
  vision_image_ids?: string[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  status?: GoalStatus;
  progress_type?: GoalProgressType;
  progress_value?: number;
  target_date?: string | null;
  category_id?: string | null;
  color?: string | null;
  icon?: string | null;
  display_order?: number;
  vision_image_ids?: string[];
}

export interface GoalTask {
  goal_id: string;
  task_id: string;
  contribution_weight: number;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  is_complete: boolean;
  display_order: number;
  created_at: string;
  completed_at: string | null;
}

export interface GoalFilters {
  status?: GoalStatus | GoalStatus[];
  category_id?: string;
  has_target_date?: boolean;
  overdue?: boolean;
}

export type GoalSortField = 'display_order' | 'target_date' | 'progress_value' | 'created_at' | 'title';

export interface GoalSortOptions {
  field: GoalSortField;
  direction: 'asc' | 'desc';
}
