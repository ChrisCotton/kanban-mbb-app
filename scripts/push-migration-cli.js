#!/usr/bin/env node

/**
 * Push Supabase Migration via CLI
 * This script helps push migrations to remote Supabase using the CLI
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const migrationFile = process.argv[2] || '20260123000002_fix_end_time_session_user_id.sql'

async function pushMigration() {
  try {
    console.log('🚀 Pushing migration to remote Supabase...\n')
    
    // Check if migration file exists
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }
    
    console.log(`📄 Migration file: ${migrationFile}`)
    console.log(`📁 Full path: ${migrationPath}\n`)
    
    // Step 1: Check if logged in
    console.log('1️⃣ Checking Supabase CLI login status...')
    try {
      execSync('supabase projects list', { stdio: 'pipe' })
      console.log('✅ Already logged in\n')
    } catch (error) {
      console.log('⚠️  Not logged in. Please run: supabase login')
      console.log('   Then run this script again.\n')
      process.exit(1)
    }
    
    // Step 2: Link project (if not already linked)
    console.log('2️⃣ Linking to remote project...')
    const projectRef = 'emxejsyyelcdpejxuvfd' // From .env.local
    try {
      execSync(`supabase link --project-ref ${projectRef}`, { stdio: 'inherit' })
      console.log('✅ Project linked\n')
    } catch (error) {
      // Project might already be linked, that's okay
      console.log('ℹ️  Project may already be linked (this is okay)\n')
    }
    
    // Step 3: Push migrations
    console.log('3️⃣ Pushing migrations to remote database...')
    console.log('   This will apply all pending migrations from supabase/migrations/\n')
    
    execSync('supabase db push', { stdio: 'inherit' })
    
    console.log('\n✅ Migration pushed successfully!')
    
  } catch (error) {
    console.error('\n❌ Error pushing migration:', error.message)
    console.error('\n📋 Alternative: Run the SQL manually in Supabase Dashboard')
    console.error('   1. Go to: https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd')
    console.error('   2. Navigate to: SQL Editor → New query')
    console.error('   3. Copy and paste the migration SQL')
    console.error(`   4. Migration file: ${path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)}`)
    process.exit(1)
  }
}

pushMigration()
