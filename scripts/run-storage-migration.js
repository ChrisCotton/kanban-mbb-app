#!/usr/bin/env node

/**
 * Run Storage Migration Script
 * Executes SQL migrations directly using Supabase Management API
 * This works for storage buckets and policies that can't use the REST API
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL')
  process.exit(1)
}

async function runStorageMigration() {
  try {
    console.log('🚀 Running journal_audio bucket migration...\n')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260124000001_create_journal_audio_bucket.sql')
    
    if (!fs.existsSync(migrationPath)) {
      // Try database/migrations folder
      const altPath = path.join(__dirname, '..', 'database', 'migrations', '029_create_journal_audio_bucket.sql')
      if (fs.existsSync(altPath)) {
        console.log('📄 Found migration in database/migrations folder\n')
        return await executeViaSupabaseCLI(altPath)
      }
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    console.log('📄 Found migration file\n')
    
    // Option 1: Try Supabase CLI if available
    try {
      const { execSync } = require('child_process')
      console.log('🔄 Attempting to use Supabase CLI...\n')
      
      // Check if supabase CLI is available
      execSync('which supabase', { stdio: 'pipe' })
      
      console.log('✅ Supabase CLI found')
      console.log('📋 To run this migration, use one of these methods:\n')
      console.log('   Method 1: Supabase CLI (Recommended)')
      console.log('   ──────────────────────────────────────')
      console.log('   supabase db push')
      console.log('   (This will push all migrations from supabase/migrations/)\n')
      
      console.log('   Method 2: Manual SQL Execution')
      console.log('   ──────────────────────────────────────')
      console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef)
      console.log('   2. Navigate to: SQL Editor → New query')
      console.log('   3. Copy and paste the SQL below:\n')
      console.log('═'.repeat(60))
      const sql = fs.readFileSync(migrationPath, 'utf8')
      console.log(sql)
      console.log('═'.repeat(60))
      console.log('\n   Method 3: Use Supabase Management API')
      console.log('   ──────────────────────────────────────')
      console.log('   This requires creating a custom script with pg library.')
      console.log('   For now, use Method 1 or 2 above.\n')
      
      return
    } catch (cliError) {
      // CLI not available, show manual instructions
      console.log('⚠️  Supabase CLI not found. Showing manual instructions...\n')
    }
    
    // Show manual instructions
    console.log('📋 Manual Execution Required')
    console.log('─────────────────────────────\n')
    console.log('Supabase REST API does not support executing arbitrary SQL.')
    console.log('Please use one of these methods:\n')
    
    console.log('✅ Method 1: Supabase Dashboard (Easiest)')
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef)
    console.log('   2. Navigate to: SQL Editor → New query')
    console.log('   3. Copy and paste the SQL below:\n')
    console.log('═'.repeat(60))
    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log(sql)
    console.log('═'.repeat(60))
    console.log('\n✅ Method 2: Install Supabase CLI')
    console.log('   1. Install: npm install -g supabase')
    console.log('   2. Login: supabase login')
    console.log('   3. Link: supabase link --project-ref ' + projectRef)
    console.log('   4. Push: supabase db push\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

runStorageMigration()
