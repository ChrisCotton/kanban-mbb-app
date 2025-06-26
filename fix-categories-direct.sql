-- Direct SQL fix for categories table
-- Run this script to add missing description column and fix schema

-- 1. Create categories table if it doesn't exist
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

-- 2. Add description column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description TEXT;
    END IF;
END $$;

-- 3. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

-- 4. Add unique constraint (drop existing if needed)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories ADD CONSTRAINT IF NOT EXISTS categories_name_user_unique UNIQUE (name, created_by);

-- 5. Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = created_by);

-- 7. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at(); 