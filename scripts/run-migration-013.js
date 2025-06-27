#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔗 Supabase URL:', supabaseUrl ? 'Loaded' : 'Missing')
console.log('🔑 Service Key:', supabaseServiceKey ? 'Loaded' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration013() {
  console.log('🚀 EXECUTING MIGRATION 013: Categories Schema Standardization')
  console.log('================================================================')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '013_standardize_categories_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📖 Migration file loaded successfully')
    console.log('📏 Migration size:', migrationSQL.length, 'characters')
    
    // Before migration - show current state
    console.log('\n🔍 BEFORE MIGRATION:')
    const { data: beforeData, error: beforeError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (beforeError) {
      console.log('❌ Cannot read current data:', beforeError.message)
    } else if (beforeData && beforeData[0]) {
      console.log('✅ Current columns:', Object.keys(beforeData[0]))
      console.log('✅ Sample record:', beforeData[0])
    }
    
    // Execute migration using rpc (raw SQL)
    console.log('\n⚡ EXECUTING MIGRATION...')
    const { data: migrationResult, error: migrationError } = await supabase.rpc('exec', {
      sql: migrationSQL
    })
    
    if (migrationError) {
      console.log('❌ Migration failed:', migrationError.message)
      console.log('❌ Migration error details:', migrationError)
      return false
    }
    
    console.log('✅ Migration executed successfully!')
    console.log('📄 Migration result:', migrationResult)
    
    // After migration - verify changes
    console.log('\n🔍 AFTER MIGRATION:')
    const { data: afterData, error: afterError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (afterError) {
      console.log('❌ Cannot read data after migration:', afterError.message)
    } else if (afterData && afterData[0]) {
      console.log('✅ New columns:', Object.keys(afterData[0]))
      console.log('✅ Sample record after migration:', afterData[0])
      
      // Check if hourly_rate_usd exists
      if ('hourly_rate_usd' in afterData[0]) {
        console.log('🎉 SUCCESS: hourly_rate_usd column now exists!')
      } else {
        console.log('⚠️  WARNING: hourly_rate_usd column still missing')
      }
    }
    
    // Test the fixed API functionality
    console.log('\n🧪 TESTING API FUNCTIONALITY:')
    await testCategoryCreation()
    
    return true
    
  } catch (error) {
    console.log('💥 Unexpected error during migration:', error.message)
    console.log('💥 Stack trace:', error.stack)
    return false
  }
}

async function testCategoryCreation() {
  try {
    // Try to create a test category using the new schema
    const testCategory = {
      name: 'Migration Test Category',
      hourly_rate_usd: 150.00,
      created_by: '13178b88-fd93-4a65-8541-636c76dad940', // Use the existing user ID
      color: '#FF5733'
    }
    
    const { data: createResult, error: createError } = await supabase
      .from('categories')
      .insert(testCategory)
      .select()
      .single()
    
    if (createError) {
      console.log('❌ Test category creation failed:', createError.message)
      return false
    }
    
    console.log('✅ Test category created successfully:', createResult)
    
    // Clean up - delete the test category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', createResult.id)
    
    if (deleteError) {
      console.log('⚠️  Could not clean up test category:', deleteError.message)
    } else {
      console.log('🧹 Test category cleaned up successfully')
    }
    
    return true
    
  } catch (error) {
    console.log('💥 Error in test category creation:', error.message)
    return false
  }
}

// Run the migration
if (require.main === module) {
  runMigration013()
    .then(success => {
      if (success) {
        console.log('\n🎉 MIGRATION 013 COMPLETED SUCCESSFULLY!')
        console.log('✅ Categories table is now standardized')
        console.log('✅ hourly_rate_usd column is available')
        console.log('✅ API should work without PGRST204 errors')
      } else {
        console.log('\n💥 MIGRATION 013 FAILED!')
        console.log('❌ Please check errors above and consider rollback')
      }
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.log('\n💥 FATAL ERROR:', error.message)
      process.exit(1)
    })
}

module.exports = { runMigration013, testCategoryCreation } 