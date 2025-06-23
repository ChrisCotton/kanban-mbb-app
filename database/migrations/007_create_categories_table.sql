-- Migration 007: Create categories table
-- This table stores task categories with their associated USD hourly rates

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Insert some default categories for new users
INSERT INTO categories (name, description, hourly_rate_usd, color, icon, created_by) 
VALUES 
    ('Development', 'Software development and coding tasks', 75.00, '#3B82F6', '💻', auth.uid()),
    ('Design', 'UI/UX design and creative work', 65.00, '#8B5CF6', '🎨', auth.uid()),
    ('Consulting', 'Client consultation and advisory work', 100.00, '#10B981', '💼', auth.uid()),
    ('Writing', 'Content creation and documentation', 50.00, '#F59E0B', '✍️', auth.uid()),
    ('Research', 'Research and analysis tasks', 60.00, '#EF4444', '🔍', auth.uid())
ON CONFLICT (name) DO NOTHING; 