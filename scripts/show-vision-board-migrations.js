#!/usr/bin/env node

/**
 * Display Vision Board Migration SQL
 * This script outputs the SQL needed to fix the vision board database setup
 * Copy and paste the output into Supabase SQL Editor
 */

const fs = require('fs')
const path = require('path')

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')

const migrations = [
  '010_create_vision_board_images_table.sql',
  '027_add_goal_and_due_date_to_vision_board.sql'
]

console.log('='.repeat(80))
console.log('VISION BOARD MIGRATION SQL')
console.log('='.repeat(80))
console.log('\n📋 Copy and paste these migrations into Supabase SQL Editor')
console.log('🔗 Go to: Supabase Dashboard → SQL Editor → New Query\n')

migrations.forEach((migrationFile, index) => {
  const migrationPath = path.join(migrationsDir, migrationFile)
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationFile}`)
    return
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('\n' + '─'.repeat(80))
  console.log(`MIGRATION ${index + 1}: ${migrationFile}`)
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('\n')
})

console.log('='.repeat(80))
console.log('STORAGE BUCKET SETUP')
console.log('='.repeat(80))
console.log('\n📦 Create storage bucket manually:')
console.log('   1. Go to: Supabase Dashboard → Storage → New Bucket')
console.log('   2. Name: vision-board')
console.log('   3. Public: ✅ Yes (checked)')
console.log('   4. Click "Create bucket"')
console.log('\n')
