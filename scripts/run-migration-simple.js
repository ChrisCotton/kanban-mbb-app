#!/usr/bin/env node

/**
 * Simple Migration Runner Script
 * Uses PostgreSQL client directly to execute migrations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile) {
  try {
    console.log(`🚀 Running migration: ${migrationFile}`)
    
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // Test database connection first
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    if (testError) {
      console.log('❌ Database connection failed:', testError.message)
      console.log('📋 Manual execution required. Please run the SQL manually in Supabase Dashboard.')
      console.log('🔗 Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1])
      console.log('📄 SQL Editor → New query → Copy and paste the migration file content')
      console.log('\n📁 Migration file location:', migrationPath)
      console.log('\n📝 Migration content preview:')
      console.log('─'.repeat(50))
      console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''))
      console.log('─'.repeat(50))
      return false
    }
    
    console.log('✅ Database connection successful')
    console.log('📋 Manual execution recommended for complex migrations')
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1])
    console.log('📄 Copy and paste this SQL in the SQL Editor:')
    console.log('\n' + '═'.repeat(50))
    console.log(sql)
    console.log('═'.repeat(50))
    
    return true
    
  } catch (error) {
    console.error(`❌ Error processing migration: ${migrationFile}`)
    console.error(error.message)
    return false
  }
}

async function runSpecificMigrations() {
  const migrationsToRun = [
    '007_create_categories_table.sql',
    '008_add_category_to_tasks.sql', 
    '009_create_time_sessions_table.sql',
    '010_create_vision_board_images_table.sql',
    '011_create_mbb_settings_table.sql'
  ]
  
  console.log('🎯 Running new migrations for integrated dashboard...')
  
  for (const migration of migrationsToRun) {
    console.log('\n' + '='.repeat(60))
    const success = await runMigration(migration)
    if (!success) {
      console.log('⚠️  Please run this migration manually before proceeding to the next one.')
      break
    }
    console.log('\n✅ Please confirm this migration was run successfully in Supabase Dashboard')
    console.log('   Then proceed to the next migration.')
  }
  
  console.log('\n🎉 All migrations listed. Please run them manually in the Supabase Dashboard.')
}

// Run the specific migrations for task 1.10
runSpecificMigrations() 