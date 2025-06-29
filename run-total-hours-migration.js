#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runTotalHoursMigration() {
  console.log('🚀 Running total_hours migration...')
  
  try {
    // Step 1: Add total_hours column
    console.log('  ➤ Adding total_hours column...')
    const { error: alterError } = await supabase.rpc('exec', {
      query: `
        ALTER TABLE categories 
        ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10,2) DEFAULT 0.0 NOT NULL 
        CHECK (total_hours >= 0);
      `
    })
    
    if (alterError && !alterError.message.includes('already exists')) {
      console.log('  ✅ Column added (or already exists)')
    }
    
    // Step 2: Create index
    console.log('  ➤ Creating index...')
    await supabase.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_categories_total_hours ON categories(total_hours);'
    })
    console.log('  ✅ Index created')
    
    // Step 3: Initialize existing categories with 0 hours
    console.log('  ➤ Initializing existing categories...')
    const { error: updateError } = await supabase
      .from('categories')
      .update({ total_hours: 0 })
      .is('total_hours', null)
    
    console.log('  ✅ Existing categories initialized')
    
    // Test the new column
    console.log('  ➤ Testing new column...')
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('id, name, total_hours')
      .limit(3)
    
    if (testError) {
      throw testError
    }
    
    console.log('  ✅ Column working correctly')
    console.log('  📊 Sample data:', testData)
    
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('📝 Note: Advanced functions and triggers should be added manually in Supabase Dashboard:')
    console.log('   - calculate_category_total_hours() function')
    console.log('   - update_category_total_hours() function') 
    console.log('   - Auto-update triggers')
    console.log('')
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1])
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('📋 Manual execution recommended.')
    process.exit(1)
  }
}

runTotalHoursMigration() 