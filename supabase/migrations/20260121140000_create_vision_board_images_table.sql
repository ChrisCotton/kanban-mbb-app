-- Migration 010: Create vision_board_images table
-- This table manages images for the vision board carousel with active/inactive status

CREATE TABLE IF NOT EXISTS vision_board_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image file details
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Storage path/URL for the image
    file_size INTEGER, -- File size in bytes
    mime_type VARCHAR(100), -- e.g., 'image/jpeg', 'image/png'
    
    -- Image metadata
    title VARCHAR(200), -- Optional title for the image
    alt_text TEXT, -- Accessibility alt text
    description TEXT, -- Optional description or caption
    
    -- Carousel control
    is_active BOOLEAN DEFAULT true, -- Whether image appears in carousel rotation
    display_order INTEGER DEFAULT 0, -- Order for display in carousel
    
    -- Image dimensions (for responsive display)
    width_px INTEGER,
    height_px INTEGER,
    
    -- Upload tracking
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size IS NULL OR file_size > 0),
    CONSTRAINT valid_dimensions CHECK (
        (width_px IS NULL AND height_px IS NULL) OR 
        (width_px > 0 AND height_px > 0)
    ),
    CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vision_board_user_id ON vision_board_images(user_id);
CREATE INDEX IF NOT EXISTS idx_vision_board_active ON vision_board_images(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vision_board_display_order ON vision_board_images(user_id, display_order, created_at);
CREATE INDEX IF NOT EXISTS idx_vision_board_uploaded_at ON vision_board_images(uploaded_at);

-- Enable Row Level Security
ALTER TABLE vision_board_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vision board images" ON vision_board_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vision board images" ON vision_board_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vision board images" ON vision_board_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vision board images" ON vision_board_images
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vision_board_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vision_board_images_updated_at
    BEFORE UPDATE ON vision_board_images
    FOR EACH ROW
    EXECUTE FUNCTION update_vision_board_images_updated_at();

-- Function to get active carousel images for a user
CREATE OR REPLACE FUNCTION get_active_carousel_images(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    file_path TEXT,
    title VARCHAR(200),
    alt_text TEXT,
    description TEXT,
    display_order INTEGER,
    width_px INTEGER,
    height_px INTEGER
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
        vbi.height_px
    FROM vision_board_images vbi
    WHERE vbi.user_id = p_user_id 
    AND vbi.is_active = true
    ORDER BY vbi.display_order ASC, vbi.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle image active status
CREATE OR REPLACE FUNCTION toggle_image_active_status(p_image_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    new_status BOOLEAN;
BEGIN
    UPDATE vision_board_images 
    SET is_active = NOT is_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_image_id 
    AND user_id = auth.uid()
    RETURNING is_active INTO new_status;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Image not found or access denied';
    END IF;
    
    RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder images
CREATE OR REPLACE FUNCTION reorder_vision_board_images(p_image_ids UUID[])
RETURNS VOID AS $$
DECLARE
    image_id UUID;
    new_order INTEGER := 0;
BEGIN
    -- Update display order for each image in the provided order
    FOREACH image_id IN ARRAY p_image_ids
    LOOP
        UPDATE vision_board_images 
        SET display_order = new_order,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = image_id 
        AND user_id = auth.uid();
        
        new_order := new_order + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record image view
CREATE OR REPLACE FUNCTION record_image_view(p_image_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE vision_board_images 
    SET last_viewed_at = CURRENT_TIMESTAMP,
        view_count = view_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_image_id 
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE vision_board_images IS 'Stores vision board images for carousel display with active/inactive status control';
COMMENT ON COLUMN vision_board_images.is_active IS 'Controls whether image appears in carousel rotation';
COMMENT ON COLUMN vision_board_images.display_order IS 'Order for displaying images in carousel (0 = first)';
COMMENT ON COLUMN vision_board_images.file_path IS 'Storage path or URL for the image file';
COMMENT ON COLUMN vision_board_images.view_count IS 'Number of times image has been viewed in carousel'; 