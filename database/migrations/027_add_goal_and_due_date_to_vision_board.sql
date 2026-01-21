-- Migration 027: Add goal, due_date, media_type, generation_prompt, ai_provider fields to vision_board_images table
-- This migration adds required goal and due_date fields, plus AI generation tracking fields

-- Add new columns
ALTER TABLE vision_board_images
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image',
ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50);

-- Backfill existing records with default values
UPDATE vision_board_images
SET 
    goal = COALESCE(goal, 'Untitled Vision'),
    due_date = COALESCE(due_date, DATE(created_at)),
    media_type = COALESCE(media_type, 'image')
WHERE goal IS NULL OR due_date IS NULL;

-- Now add NOT NULL constraints after backfilling
ALTER TABLE vision_board_images
ALTER COLUMN goal SET NOT NULL,
ALTER COLUMN due_date SET NOT NULL;

-- Add constraint to prevent empty/whitespace-only goals
ALTER TABLE vision_board_images
ADD CONSTRAINT valid_goal CHECK (LENGTH(TRIM(goal)) > 0);

-- Add constraint for media_type
ALTER TABLE vision_board_images
ADD CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video'));

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_vision_board_due_date ON vision_board_images(due_date);
CREATE INDEX IF NOT EXISTS idx_vision_board_user_due_date ON vision_board_images(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_vision_board_media_type ON vision_board_images(media_type);

-- Update the get_active_carousel_images function to include new fields
CREATE OR REPLACE FUNCTION get_active_carousel_images(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    file_path TEXT,
    title VARCHAR(200),
    alt_text TEXT,
    description TEXT,
    display_order INTEGER,
    width_px INTEGER,
    height_px INTEGER,
    goal TEXT,
    due_date DATE,
    media_type VARCHAR(20)
) AS $$
BEGIN
    -- Use current user if no user_id provided
    IF p_user_id IS NULL THEN
        p_user_id := auth.uid();
    END IF;
    
    RETURN QUERY
    SELECT 
        vbi.id,
        vbi.file_path,
        vbi.title,
        vbi.alt_text,
        vbi.description,
        vbi.display_order,
        vbi.width_px,
        vbi.height_px,
        vbi.goal,
        vbi.due_date,
        vbi.media_type
    FROM vision_board_images vbi
    WHERE vbi.user_id = p_user_id 
    AND vbi.is_active = true
    ORDER BY vbi.display_order ASC, vbi.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN vision_board_images.goal IS 'Required goal text associated with this vision board image';
COMMENT ON COLUMN vision_board_images.due_date IS 'Required due date for the goal (can be past or future)';
COMMENT ON COLUMN vision_board_images.goal_id IS 'Optional reference to goals table for future integration';
COMMENT ON COLUMN vision_board_images.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN vision_board_images.generation_prompt IS 'AI generation prompt used (NULL for manual uploads)';
COMMENT ON COLUMN vision_board_images.ai_provider IS 'AI provider used for generation (NULL for manual uploads)';
