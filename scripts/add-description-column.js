#!/usr/bin/env node

/**
 * Add missing description column to categories table
 * This is a targeted fix for the immediate issue
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Adding description column to categories table...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addDescriptionColumn() {
  try {
    // Check if the column already exists by testing a query
    console.log('1. Testing current table structure...')
    
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('id, name, description')
      .limit(1)
    
    if (!testError) {
      console.log('✅ Description column already exists!')
      return
    }
    
    if (testError.message.includes('does not exist')) {
      console.log('❌ Description column is missing. Attempting to add it...')
      
      // Try to use the built-in SQL features
      // First, let's check if we can add a record without description
      const { data: insertTest, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: 'Temp Test Category',
          hourly_rate_usd: 50.00,
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
      
      if (insertTest) {
        console.log('✅ Can insert into categories table')
        
        // Clean up test record
        await supabase
          .from('categories')
          .delete()
          .eq('id', insertTest[0].id)
        
        // The table exists but description column is missing
        // Let's try using Supabase's SQL editor functionality
        console.log('💡 Table exists but missing description column.')
        console.log('📋 You need to manually run this SQL in your Supabase dashboard:')
        console.log('   ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;')
        console.log('')
        console.log('🌐 Go to: https://app.supabase.com > Your Project > SQL Editor')
        console.log('📝 Run: ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;')
        
        return false
      }
      
      if (insertError && insertError.code === '42P01') {
        console.log('❌ Categories table does not exist at all!')
        console.log('📋 You need to create the entire table in your Supabase dashboard:')
        console.log('')
        console.log('🌐 Go to: https://app.supabase.com > Your Project > SQL Editor')
        console.log('📝 Run this SQL:')
        console.log(`
CREATE TABLE categories (
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
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(name, created_by)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = created_by);
        `)
        
        return false
      }
      
    } else {
      console.log('🤔 Unexpected error:', testError.message)
      return false
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Run the fix
addDescriptionColumn()
  .then((success) => {
    if (success !== false) {
      console.log('\n🎉 Description column fix completed!')
      console.log('🔍 Testing the API...')
      
      // Test the API endpoint
      const testUrl = 'http://localhost:3000/api/categories?user_id=550e8400-e29b-41d4-a716-446655440000'
      console.log(`📡 Test URL: ${testUrl}`)
      
      fetch(testUrl)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('✅ Categories API is working!')
          } else {
            console.log('❌ Categories API still has issues:', data.error)
          }
        })
        .catch(err => {
          console.log('❌ Failed to test API:', err.message)
        })
        .finally(() => {
          process.exit(0)
        })
    } else {
      console.log('\n⚠️  Manual intervention required (see instructions above)')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 Process failed:', error.message)
    process.exit(1)
  }) 