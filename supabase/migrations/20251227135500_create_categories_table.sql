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
CREATE INDEX IF NOT EXISTS idx_categories_hourly_rate ON categories(hourly_rate_usd);

-- Add unique constraint per user
ALTER TABLE categories ADD CONSTRAINT categories_name_created_by_unique 
    UNIQUE (name, created_by);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

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
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Create tasks table with category reference
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Enable RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE categories IS 'Task categories with standardized hourly_rate_usd column naming';
COMMENT ON COLUMN categories.hourly_rate_usd IS 'Hourly rate in USD for MBB calculations';
COMMENT ON COLUMN categories.created_by IS 'User ID of category creator (used for RLS)';
COMMENT ON COLUMN tasks.category_id IS 'Foreign key reference to categories table'; 