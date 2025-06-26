#!/usr/bin/env node

/**
 * Database Repair CLI
 * Automated repair suggestions for common database issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runRepair() {
  console.log('🔧 Database Repair Tool')
  console.log('=' .repeat(50))
  
  const repairs = []
  
  // Check categories table
  console.log('1. Checking categories table...')
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, hourly_rate')
      .limit(1)
    
    if (error && error.code === '42P01') {
      repairs.push({
        issue: 'Categories table missing',
        severity: 'critical',
        fix: 'Create categories table in Supabase dashboard',
        sql: getCategoriesTableSQL()
      })
    } else if (error && error.message.includes('does not exist')) {
      const missingColumn = error.message.match(/column "(\w+)"/)?.[1]
      repairs.push({
        issue: `Missing column: ${missingColumn}`,
        severity: 'high',
        fix: `Add missing column to categories table`,
        sql: getAddColumnSQL(missingColumn)
      })
    } else if (!error) {
      console.log('   ✅ Categories table exists and accessible')
    }
  } catch (e) {
    repairs.push({
      issue: 'Cannot access categories table',
      severity: 'critical',
      fix: 'Check database connection and permissions',
      error: e.message
    })
  }
  
  // Check API endpoints
  console.log('2. Checking API endpoints...')
  try {
    const response = await fetch('http://localhost:3000/api/categories?user_id=test')
    if (response.status === 500) {
      const errorData = await response.json()
      repairs.push({
        issue: 'Categories API returning 500 error',
        severity: 'high',
        fix: 'Fix database schema or restart server',
        details: errorData.error
      })
    } else {
      console.log('   ✅ Categories API responding')
    }
  } catch (e) {
    repairs.push({
      issue: 'Cannot reach Categories API',
      severity: 'medium',
      fix: 'Start development server',
      command: 'npm run dev'
    })
  }
  
  // Print repair suggestions
  console.log('\n🛠️  Repair Suggestions')
  console.log('=' .repeat(50))
  
  if (repairs.length === 0) {
    console.log('✅ No issues found! Database appears healthy.')
    return
  }
  
  repairs.forEach((repair, index) => {
    const emoji = repair.severity === 'critical' ? '🚨' : 
                 repair.severity === 'high' ? '⚠️' : 'ℹ️'
    
    console.log(`${emoji} Issue ${index + 1}: ${repair.issue}`)
    console.log(`   Severity: ${repair.severity}`)
    console.log(`   Fix: ${repair.fix}`)
    
    if (repair.sql) {
      console.log(`   SQL:`)
      console.log(repair.sql.split('\n').map(line => `       ${line}`).join('\n'))
    }
    
    if (repair.command) {
      console.log(`   Command: ${repair.command}`)
    }
    
    if (repair.details) {
      console.log(`   Details: ${repair.details}`)
    }
    
    console.log()
  })
  
  console.log('�� Manual Steps Required:')
  console.log('1. Go to https://app.supabase.com')
  console.log('2. Open your project')
  console.log('3. Go to SQL Editor')
  console.log('4. Run the SQL commands shown above')
}

function getCategoriesTableSQL() {
  return `
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(name, created_by)
);
`
}

function getAddColumnSQL(columnName) {
  const definitions = {
    'description': 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;',
    'icon': 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(10);',
    'hourly_rate_usd': 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS hourly_rate_usd DECIMAL(10,2);'
  }
  
  return definitions[columnName] || `-- Add column: ${columnName}`
}

runRepair().catch((error) => {
  console.error('Repair failed:', error.message)
  process.exit(1)
})
