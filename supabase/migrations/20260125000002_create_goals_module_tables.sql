-- Migration: Create Goals Module Tables
-- Date: 2026-01-25
-- Creates tables for goals, goal-task relationships, goal-vision image relationships, and goal milestones

-- 1. Goals Table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  progress_type VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (progress_type IN ('manual', 'task_based', 'milestone_based')),
  progress_value INTEGER NOT NULL DEFAULT 0
    CHECK (progress_value >= 0 AND progress_value <= 100),
  target_date DATE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  color VARCHAR(7),
  icon VARCHAR(50),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Goal-Task Junction Table
CREATE TABLE IF NOT EXISTS goal_tasks (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  contribution_weight INTEGER NOT NULL DEFAULT 1
    CHECK (contribution_weight >= 1 AND contribution_weight <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (goal_id, task_id)
);

-- 3. Goal-Vision Image Junction Table
CREATE TABLE IF NOT EXISTS goal_vision_images (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  vision_image_id UUID NOT NULL REFERENCES vision_board_images(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (goal_id, vision_image_id)
);

-- 4. Goal Milestones Table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_display_order ON goals(user_id, display_order);

CREATE INDEX IF NOT EXISTS idx_goal_tasks_task_id ON goal_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON goal_tasks(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_vision_images_vision_id ON goal_vision_images(vision_image_id);
CREATE INDEX IF NOT EXISTS idx_goal_vision_images_goal_id ON goal_vision_images(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_display_order ON goal_milestones(goal_id, display_order);

-- 6. Row Level Security Policies

-- Goals table RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own goals" ON goals;
CREATE POLICY "Users can create own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- Goal-Tasks junction table RLS
ALTER TABLE goal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goal_tasks" ON goal_tasks;
CREATE POLICY "Users can manage own goal_tasks" ON goal_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_tasks.goal_id AND goals.user_id = auth.uid())
  );

-- Goal-Vision Images junction table RLS
ALTER TABLE goal_vision_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goal_vision_images" ON goal_vision_images;
CREATE POLICY "Users can manage own goal_vision_images" ON goal_vision_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_vision_images.goal_id AND goals.user_id = auth.uid())
  );

-- Goal Milestones table RLS
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goal_milestones" ON goal_milestones;
CREATE POLICY "Users can manage own goal_milestones" ON goal_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid())
  );

-- 7. Updated_at Trigger Function (reuse existing if available, otherwise create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for goals table
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE goals IS 'User goals with progress tracking and categorization';
COMMENT ON TABLE goal_tasks IS 'Junction table linking goals to tasks with contribution weights';
COMMENT ON TABLE goal_vision_images IS 'Junction table linking goals to vision board images';
COMMENT ON TABLE goal_milestones IS 'Milestones for milestone-based goal progress tracking';
