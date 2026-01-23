-- Create categories table with standardized schema
-- This is the initial migration for local development

-- Create categories table with correct schema
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hourly_rate_usd DECIMAL(10,2) NOT NULL CHECK (hourly_rate_usd >= 0),
    color VARCHAR(7), -- For hex color codes like #FF5733
    icon VARCHAR(10), -- For emoji or icon identifiers
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_name_created_by ON categories(name, created_by);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;

-- Only create hourly_rate index if the column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'hourly_rate_usd'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_categories_hourly_rate ON categories(hourly_rate_usd);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'hourly_rate'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_categories_hourly_rate ON categories(hourly_rate);
    END IF;
END $$;

-- Add unique constraint per user only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_name_created_by_unique'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT categories_name_created_by_unique 
            UNIQUE (name, created_by);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

-- Create RLS policies using created_by
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = created_by);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    -- Always ensure updated_by is set (never NULL)
    -- Priority: NEW.updated_by (if explicitly set) > auth.uid() > OLD.updated_by > OLD.created_by
    NEW.updated_by = COALESCE(
        NEW.updated_by,  -- Use explicitly set value first
        auth.uid(),      -- Then try current user
        OLD.updated_by,  -- Then preserve existing updated_by
        OLD.created_by   -- Finally fall back to created_by (should always exist)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Add comments for documentation
COMMENT ON TABLE categories IS 'Task categories with standardized hourly_rate_usd column naming';
COMMENT ON COLUMN categories.hourly_rate_usd IS 'Hourly rate in USD for MBB calculations';
COMMENT ON COLUMN categories.created_by IS 'User ID of category creator (used for RLS)'; 