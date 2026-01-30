-- Migration: Add Progress Calculation Triggers
-- Date: 2026-01-28
-- Creates triggers to automatically recalculate goal progress when:
-- 1. Task status changes (task marked done/undone)
-- 2. Task is linked/unlinked from a goal
-- 3. Milestone is completed/uncompleted

-- Function to recalculate progress for a goal
CREATE OR REPLACE FUNCTION recalculate_goal_progress(p_goal_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_progress_type VARCHAR(20);
  v_progress_value INTEGER;
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_completed_weight INTEGER;
  v_total_weight INTEGER;
BEGIN
  -- Get the goal's progress_type
  SELECT progress_type INTO v_progress_type
  FROM goals
  WHERE id = p_goal_id;

  -- Only recalculate if progress_type is task_based or milestone_based
  IF v_progress_type = 'manual' THEN
    RETURN;
  END IF;

  -- Calculate progress based on type
  IF v_progress_type = 'task_based' THEN
    -- Get all linked tasks with their weights
    SELECT 
      COALESCE(SUM(CASE WHEN t.status = 'done' THEN gt.contribution_weight ELSE 0 END), 0),
      COALESCE(SUM(gt.contribution_weight), 0)
    INTO v_completed_weight, v_total_weight
    FROM goal_tasks gt
    INNER JOIN tasks t ON gt.task_id = t.id
    WHERE gt.goal_id = p_goal_id;

    -- Calculate progress percentage
    IF v_total_weight > 0 THEN
      v_progress_value := ROUND((v_completed_weight::NUMERIC / v_total_weight::NUMERIC) * 100);
      -- Ensure value is between 0 and 100
      v_progress_value := GREATEST(0, LEAST(100, v_progress_value));
    ELSE
      v_progress_value := 0;
    END IF;

  ELSIF v_progress_type = 'milestone_based' THEN
    -- Count completed milestones
    SELECT 
      COUNT(*) FILTER (WHERE is_complete = true),
      COUNT(*)
    INTO v_completed_count, v_total_count
    FROM goal_milestones
    WHERE goal_id = p_goal_id;

    -- Calculate progress percentage
    IF v_total_count > 0 THEN
      v_progress_value := ROUND((v_completed_count::NUMERIC / v_total_count::NUMERIC) * 100);
      -- Ensure value is between 0 and 100
      v_progress_value := GREATEST(0, LEAST(100, v_progress_value));
    ELSE
      v_progress_value := 0;
    END IF;
  END IF;

  -- Update the goal's progress_value
  UPDATE goals
  SET progress_value = v_progress_value,
      updated_at = NOW()
  WHERE id = p_goal_id;
END;
$$;

-- Trigger function for task status changes
CREATE OR REPLACE FUNCTION trigger_recalculate_progress_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  -- Only recalculate if status changed to/from 'done'
  IF (OLD.status = 'done' AND NEW.status != 'done') OR
     (OLD.status != 'done' AND NEW.status = 'done') THEN
    
    -- Recalculate progress for all goals linked to this task
    FOR v_goal_id IN
      SELECT DISTINCT goal_id
      FROM goal_tasks
      WHERE task_id = NEW.id
    LOOP
      PERFORM recalculate_goal_progress(v_goal_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for goal_tasks changes (link/unlink)
CREATE OR REPLACE FUNCTION trigger_recalculate_progress_on_task_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate progress for the affected goal
  IF TG_OP = 'INSERT' THEN
    PERFORM recalculate_goal_progress(NEW.goal_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalculate_goal_progress(OLD.goal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for milestone changes
CREATE OR REPLACE FUNCTION trigger_recalculate_progress_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only recalculate if is_complete changed
  IF (OLD.is_complete IS DISTINCT FROM NEW.is_complete) THEN
    PERFORM recalculate_goal_progress(NEW.goal_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers

-- Trigger on task status change
DROP TRIGGER IF EXISTS trigger_task_status_change ON tasks;
CREATE TRIGGER trigger_task_status_change
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_recalculate_progress_on_task_change();

-- Trigger on goal_tasks insert/delete (link/unlink)
DROP TRIGGER IF EXISTS trigger_goal_tasks_change ON goal_tasks;
CREATE TRIGGER trigger_goal_tasks_change
  AFTER INSERT OR DELETE ON goal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_progress_on_task_link();

-- Trigger on goal_tasks update (weight change)
DROP TRIGGER IF EXISTS trigger_goal_tasks_weight_change ON goal_tasks;
CREATE TRIGGER trigger_goal_tasks_weight_change
  AFTER UPDATE OF contribution_weight ON goal_tasks
  FOR EACH ROW
  WHEN (OLD.contribution_weight IS DISTINCT FROM NEW.contribution_weight)
  EXECUTE FUNCTION trigger_recalculate_progress_on_task_link();

-- Trigger on milestone completion change
DROP TRIGGER IF EXISTS trigger_milestone_completion_change ON goal_milestones;
CREATE TRIGGER trigger_milestone_completion_change
  AFTER UPDATE OF is_complete ON goal_milestones
  FOR EACH ROW
  WHEN (OLD.is_complete IS DISTINCT FROM NEW.is_complete)
  EXECUTE FUNCTION trigger_recalculate_progress_on_milestone_change();

-- Trigger on milestone insert/delete
DROP TRIGGER IF EXISTS trigger_milestone_insert_delete ON goal_milestones;
CREATE TRIGGER trigger_milestone_insert_delete
  AFTER INSERT OR DELETE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_progress_on_milestone_change();

-- Comments for documentation
COMMENT ON FUNCTION recalculate_goal_progress(UUID) IS 'Recalculates and updates progress_value for a goal based on its progress_type';
COMMENT ON FUNCTION trigger_recalculate_progress_on_task_change() IS 'Trigger function to recalculate goal progress when task status changes';
COMMENT ON FUNCTION trigger_recalculate_progress_on_task_link() IS 'Trigger function to recalculate goal progress when tasks are linked/unlinked';
COMMENT ON FUNCTION trigger_recalculate_progress_on_milestone_change() IS 'Trigger function to recalculate goal progress when milestone completion changes';
