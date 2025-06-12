#!/usr/bin/env node

/**
 * Migration Display Script
 * Usage: node scripts/show-migration.js <migration-file>
 * This script just displays the SQL for manual copy-paste into Supabase dashboard
 */

const fs = require('fs')
const path = require('path')

function showMigration(migrationFile) {
  try {
    // Handle both full path and filename
    let migrationPath
    if (migrationFile.includes('database/migrations/')) {
      migrationPath = path.join(__dirname, '..', migrationFile)
    } else {
      migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile)
    }
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('=' .repeat(80))
    console.log(`📄 Migration: ${migrationFile}`)
    console.log('=' .repeat(80))
    console.log()
    console.log('Copy the SQL below and paste it into your Supabase SQL Editor:')
    console.log()
    console.log('-' .repeat(80))
    console.log(migrationSQL)
    console.log('-' .repeat(80))
    console.log()
    console.log('✅ Copy the SQL above and run it in Supabase Dashboard > SQL Editor')
    
  } catch (error) {
    console.error(`❌ Error reading migration: ${error.message}`)
    process.exit(1)
  }
}

// Main execution
const migrationFile = process.argv[2]

if (migrationFile) {
  showMigration(migrationFile)
} else {
  console.log('Usage:')
  console.log('  node scripts/show-migration.js <migration-file>')
  console.log('  node scripts/show-migration.js 004_create_comments_table.sql')
} 