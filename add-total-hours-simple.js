#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addTotalHoursColumn() {
  console.log('🚀 Adding total_hours column to categories table...')
  
  try {
    // Test current table structure first
    console.log('  ➤ Checking current table structure...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'categories')
      .eq('table_schema', 'public')
    
    if (columnsError) {
      console.log('❌ Cannot check table structure:', columnsError.message)
      console.log('📋 Manual execution required via Supabase Dashboard')
      console.log('')
      console.log('🔗 Go to: https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1])
      console.log('📄 SQL Editor → New query → Run this SQL:')
      console.log('')
      console.log('ALTER TABLE categories ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10,2) DEFAULT 0.0 NOT NULL;')
      console.log('UPDATE categories SET total_hours = 0.0 WHERE total_hours IS NULL;')
      console.log('')
      return
    }
    
    const columnNames = columns.map(c => c.column_name)
    console.log('  📊 Current columns:', columnNames.join(', '))
    
    if (columnNames.includes('total_hours')) {
      console.log('  ✅ total_hours column already exists!')
    } else {
      console.log('  ➤ total_hours column missing - manual addition required')
      console.log('')
      console.log('📋 Please add the column manually via Supabase Dashboard:')
      console.log('🔗 Go to: https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1])
      console.log('📄 SQL Editor → New query → Run this SQL:')
      console.log('')
      console.log('ALTER TABLE categories ADD COLUMN total_hours NUMERIC(10,2) DEFAULT 0.0 NOT NULL;')
      console.log('UPDATE categories SET total_hours = 0.0;')
      console.log('')
    }
    
    // Test if we can query categories
    console.log('  ➤ Testing categories table access...')
    const { data: categories, error: testError } = await supabase
      .from('categories')
      .select('id, name, hourly_rate_usd')
      .limit(2)
    
    if (testError) {
      console.log('❌ Categories table access failed:', testError.message)
    } else {
      console.log('  ✅ Categories table accessible')
      console.log('  📊 Sample categories:', categories.length)
      if (categories.length > 0) {
        console.log('    -', categories[0].name)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addTotalHoursColumn() 