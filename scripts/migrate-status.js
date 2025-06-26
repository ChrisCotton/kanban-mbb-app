#!/usr/bin/env node

/**
 * Migration Status CLI
 * Check migration status and provide recommendations
 */

const fs = require('fs')
const path = require('path')

function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')
  
  if (!fs.existsSync(migrationsDir)) {
    return []
  }

  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
}

function checkMigrationStatus() {
  console.log('📋 Migration Status Check')
  console.log('=' .repeat(50))
  
  const migrationFiles = getMigrationFiles()
  
  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found in database/migrations/')
    return
  }
  
  console.log(`Found ${migrationFiles.length} migration files:`)
  console.log()
  
  migrationFiles.forEach((file, index) => {
    const num = String(index + 1).padStart(2, '0')
    console.log(`${num}. ${file}`)
  })
  
  console.log()
  console.log('💡 Migration Recommendations:')
  console.log('- Run migrations in order using Supabase SQL Editor')
  console.log('- Check for any failed migrations')
  console.log('- Verify schema matches expectations')
  console.log()
  
  // Check for common issues
  const categoriesFile = migrationFiles.find(f => f.includes('categories'))
  if (categoriesFile) {
    console.log(`✅ Categories migration found: ${categoriesFile}`)
  } else {
    console.log('⚠️  No categories migration file found')
  }
  
  const tasksFile = migrationFiles.find(f => f.includes('tasks'))
  if (tasksFile) {
    console.log(`✅ Tasks migration found: ${tasksFile}`)
  } else {
    console.log('⚠️  No tasks migration file found')
  }
}

checkMigrationStatus()
