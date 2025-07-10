#!/usr/bin/env node

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Running Migration 013: Categories Schema Standardization')
console.log('==========================================================')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('📄 Reading migration file...')
    const migrationPath = 'database/migrations/013_standardize_categories_schema.sql'
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🔍 Pre-migration check: Current categories sample...')
    
    // Check current state
    const { data: preMigration, error: preError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (preError) {
      console.log('❌ Pre-migration check failed:', preError.message)
    } else if (preMigration && preMigration.length > 0) {
      console.log('📋 Current schema columns:', Object.keys(preMigration[0]))
    }
    
    console.log('\n💡 Migration needs manual execution in Supabase SQL Editor:')
    console.log('   1. Go to https://app.supabase.com')
    console.log('   2. Open your project') 
    console.log('   3. Go to SQL Editor')
    console.log('   4. Copy and paste the migration SQL from:')
    console.log('      database/migrations/013_standardize_categories_schema.sql')
    console.log('   5. Execute the SQL')
    console.log('\n📋 Migration SQL preview (first 500 chars):')
    console.log(sql.substring(0, 500) + '...')
    
    return true
    
  } catch (error) {
    console.error('❌ Error reading migration:', error.message)
    return false
  }
}

runMigration()
  .then((success) => {
    if (success) {
      console.log('\n🎯 Please run the migration manually in Supabase SQL Editor')
      console.log('   After running it, you can test with: node scripts/check-categories-schema.js')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Process failed:', error.message)
    process.exit(1)
  })
