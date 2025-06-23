#!/usr/bin/env node

/**
 * Manual Migration Helper
 * Outputs SQL for manual execution in Supabase Dashboard
 */

const fs = require('fs')
const path = require('path')

const migrationsToRun = [
  '007_create_categories_table.sql',
  '008_add_category_to_tasks.sql', 
  '009_create_time_sessions_table.sql',
  '010_create_vision_board_images_table.sql',
  '011_create_mbb_settings_table.sql'
]

console.log('🎯 Database Migrations for Integrated Dashboard Layout')
console.log('=' .repeat(60))
console.log('📋 Copy and paste each migration into Supabase SQL Editor')
console.log('🔗 Dashboard: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd')
console.log('📄 Go to: SQL Editor → New Query → Paste SQL → Run')
console.log('')

migrationsToRun.forEach((migrationFile, index) => {
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile)
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📁 MIGRATION ${index + 1}/5: ${migrationFile}`)
  console.log(`${'='.repeat(60)}`)
  console.log(sql)
  console.log(`\n✅ After running this migration, proceed to the next one.`)
  console.log(`${'='.repeat(60)}\n`)
})

console.log('🎉 All 5 migrations listed above.')
console.log('👆 Please run them ONE AT A TIME in the Supabase Dashboard.')
console.log('⚠️  Important: Run in the exact order shown above!') 