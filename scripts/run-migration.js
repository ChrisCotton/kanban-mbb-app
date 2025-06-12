#!/usr/bin/env node

/**
 * Migration Runner Script
 * Usage: node scripts/run-migration.js <migration-file>
 * Example: node scripts/run-migration.js 001_create_kanban_enums.sql
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local (Next.js convention)
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile) {
  try {
    console.log(`🚀 Running migration: ${migrationFile}`)
    
    // Read the migration file - handle both full path and filename
    let migrationPath
    if (migrationFile.includes('database/migrations/')) {
      // Full path provided
      migrationPath = path.join(__dirname, '..', migrationFile)
    } else {
      // Just filename provided
      migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile)
    }
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration using REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql: migrationSQL })
    })
    
    if (!response.ok) {
      // If exec RPC doesn't exist, try direct SQL execution via PostgREST
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Accept': 'application/json'
        },
        body: migrationSQL
      })
      
      if (!sqlResponse.ok) {
        const errorText = await sqlResponse.text()
        throw new Error(`HTTP ${sqlResponse.status}: ${errorText}`)
      }
    }
    
    console.log(`✅ Migration completed successfully: ${migrationFile}`)
    
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`)
    console.error(error.message)
    process.exit(1)
  }
}

async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`)
    process.exit(1)
  }
  
  // Get all .sql files and sort them
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
  
  if (migrationFiles.length === 0) {
    console.log('📭 No migration files found')
    return
  }
  
  console.log(`🏃 Running ${migrationFiles.length} migrations...`)
  
  for (const file of migrationFiles) {
    await runMigration(file)
  }
  
  console.log('🎉 All migrations completed successfully!')
}

// Main execution
const migrationFile = process.argv[2]

if (migrationFile === 'all') {
  runAllMigrations()
} else if (migrationFile) {
  runMigration(migrationFile)
} else {
  console.log('Usage:')
  console.log('  node scripts/run-migration.js <migration-file>')
  console.log('  node scripts/run-migration.js 001_create_kanban_enums.sql')
  console.log('  node scripts/run-migration.js all')
} 