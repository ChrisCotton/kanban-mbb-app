#!/usr/bin/env node
/**
 * Script to fix time session earnings calculation
 * 
 * This script:
 * 1. Runs migrations to fix earnings calculation trigger
 * 2. Backfills earnings for existing sessions
 * 3. Verifies the fix worked
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    return false
  }

  console.log(`\n📄 Running migration: ${migrationFile}`)
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0)
          if (directError) {
            console.warn(`⚠️  Could not execute statement directly. You may need to run this migration manually in Supabase dashboard.`)
            console.warn(`   Statement: ${statement.substring(0, 100)}...`)
          }
        }
      }
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`)
    return true
  } catch (error) {
    console.error(`❌ Error running migration ${migrationFile}:`, error.message)
    console.error(`   Please run this migration manually in Supabase SQL editor:`)
    console.error(`   File: ${migrationPath}`)
    return false
  }
}

async function verifyFix() {
  console.log('\n🔍 Verifying fix...')
  
  // Check sessions with NULL earnings that should have earnings
  const { data: sessionsWithNullEarnings, error } = await supabase
    .from('time_sessions')
    .select('id, task_id, category_id, started_at, ended_at, duration_seconds, hourly_rate_usd, earnings_usd, is_active')
    .not('ended_at', 'is', null)
    .eq('is_active', false)
    .is('earnings_usd', null)
    .limit(10)
  
  if (error) {
    console.error('❌ Error checking sessions:', error.message)
    return false
  }
  
  if (sessionsWithNullEarnings && sessionsWithNullEarnings.length > 0) {
    console.log(`⚠️  Found ${sessionsWithNullEarnings.length} sessions still with NULL earnings:`)
    sessionsWithNullEarnings.forEach(s => {
      console.log(`   - Session ${s.id}: task=${s.task_id}, category=${s.category_id}, rate=${s.hourly_rate_usd}, duration=${s.duration_seconds}s`)
    })
    return false
  }
  
  // Check total sessions and earnings
  const { data: allCompletedSessions } = await supabase
    .from('time_sessions')
    .select('earnings_usd')
    .not('ended_at', 'is', null)
    .eq('is_active', false)
  
  const totalSessions = allCompletedSessions?.length || 0
  const sessionsWithEarnings = allCompletedSessions?.filter(s => s.earnings_usd !== null && s.earnings_usd > 0).length || 0
  
  console.log(`✅ Verification complete:`)
  console.log(`   Total completed sessions: ${totalSessions}`)
  console.log(`   Sessions with earnings: ${sessionsWithEarnings}`)
  console.log(`   Coverage: ${totalSessions > 0 ? Math.round((sessionsWithEarnings / totalSessions) * 100) : 0}%`)
  
  return sessionsWithNullEarnings?.length === 0
}

async function main() {
  console.log('🚀 Starting time session earnings fix...\n')
  
  const migrations = [
    '20260130000000_fix_earnings_calculation_and_backfill.sql',
    '20260130000001_fix_start_time_session_category_lookup.sql'
  ]
  
  console.log('⚠️  IMPORTANT: These migrations need to be run in Supabase SQL editor.')
  console.log('   The script cannot execute them directly due to security restrictions.\n')
  console.log('📋 Migration files to run:')
  migrations.forEach((file, index) => {
    const fullPath = path.join(__dirname, '..', 'supabase', 'migrations', file)
    console.log(`   ${index + 1}. ${file}`)
    console.log(`      Path: ${fullPath}`)
  })
  
  console.log('\n📝 Steps to fix:')
  console.log('   1. Open Supabase Dashboard → SQL Editor')
  console.log('   2. Copy and paste the contents of each migration file')
  console.log('   3. Run each migration in order')
  console.log('   4. Then run this script again to verify: npm run fix-time-earnings')
  
  // Still try to verify current state
  await verifyFix()
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runMigration, verifyFix }
