#!/usr/bin/env node

/**
 * Immediate Fix for Categories Table
 * Adds missing description column and fixes immediate issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCategoriesTable() {
  console.log('🔧 Starting immediate fix for categories table...')
  
  try {
    // Step 1: Check if categories table exists
    console.log('1. Checking if categories table exists...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'categories')
    
    if (tablesError) {
      console.log('  Creating categories table...')
      // Create the entire categories table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          hourly_rate_usd DECIMAL(10,2) NOT NULL CHECK (hourly_rate_usd >= 0),
          color VARCHAR(7),
          icon VARCHAR(10),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES auth.users(id),
          updated_by UUID REFERENCES auth.users(id)
        );`
      
      const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL })
      if (createError) {
        // Try alternative approach by using REST API directly
        console.log('  Using alternative table creation method...')
        await executeSQL(createTableSQL)
      }
      console.log('  ✅ Categories table created')
    } else {
      console.log('  ✅ Categories table exists')
    }
    
    // Step 2: Check if description column exists
    console.log('2. Checking for description column...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'categories')
      .eq('column_name', 'description')
    
    if (!columns || columns.length === 0) {
      console.log('  Adding missing description column...')
      const addColumnSQL = 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;'
      await executeSQL(addColumnSQL)
      console.log('  ✅ Description column added')
    } else {
      console.log('  ✅ Description column exists')
    }
    
    // Step 3: Add unique constraint
    console.log('3. Adding unique constraint...')
    const constraintSQL = `
      ALTER TABLE categories 
      ADD CONSTRAINT IF NOT EXISTS categories_name_user_unique 
      UNIQUE (name, created_by);`
    await executeSQL(constraintSQL)
    console.log('  ✅ Unique constraint added')
    
    // Step 4: Create indexes
    console.log('4. Creating indexes...')
    const indexSQLs = [
      'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);',
      'CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);'
    ]
    
    for (const sql of indexSQLs) {
      await executeSQL(sql)
    }
    console.log('  ✅ Indexes created')
    
    // Step 5: Enable RLS
    console.log('5. Setting up Row Level Security...')
    const rlsSQL = 'ALTER TABLE categories ENABLE ROW LEVEL SECURITY;'
    await executeSQL(rlsSQL)
    
    // Create RLS policies
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Users can view their own categories" ON categories
       FOR SELECT USING (auth.uid() = created_by);`,
      `CREATE POLICY IF NOT EXISTS "Users can insert their own categories" ON categories
       FOR INSERT WITH CHECK (auth.uid() = created_by);`,
      `CREATE POLICY IF NOT EXISTS "Users can update their own categories" ON categories
       FOR UPDATE USING (auth.uid() = created_by);`,
      `CREATE POLICY IF NOT EXISTS "Users can delete their own categories" ON categories
       FOR DELETE USING (auth.uid() = created_by);`
    ]
    
    for (const policy of policies) {
      await executeSQL(policy)
    }
    console.log('  ✅ RLS policies created')
    
    // Step 6: Test the table
    console.log('6. Testing categories table...')
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.error('  ❌ Test failed:', testError.message)
    } else {
      console.log('  ✅ Categories table is working correctly')
    }
    
    console.log('\n🎉 Categories table fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message)
    process.exit(1)
  }
}

async function executeSQL(sql) {
  try {
    // Method 1: Try using rpc if available
    const { error } = await supabase.rpc('exec', { sql })
    if (!error) return
  } catch (e) {
    // Method 1 failed, try method 2
  }
  
  try {
    // Method 2: Use REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
  } catch (e) {
    // Method 2 failed, try method 3 - direct SQL via supabase-js
    const { error } = await supabase.sql`${sql}`
    if (error) {
      throw error
    }
  }
}

// Run the fix
fixCategoriesTable()
  .then(() => {
    console.log('Process completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Process failed:', error)
    process.exit(1)
  }) 