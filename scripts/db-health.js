#!/usr/bin/env node

/**
 * Database Health Check CLI
 * Comprehensive health check for database and API endpoints
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runHealthCheck() {
  console.log('🏥 Database Health Check')
  console.log('=' .repeat(50))
  
  const results = []
  const startTime = Date.now()

  // Check 1: Database Connection
  console.log('1. Testing database connection...')
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1)
    
    if (error && error.code === '42P01') {
      results.push({ name: 'Connection', status: '⚠️', message: 'Connected, but categories table missing' })
    } else if (error) {
      results.push({ name: 'Connection', status: '❌', message: `Connection failed: ${error.message}` })
    } else {
      results.push({ name: 'Connection', status: '✅', message: 'Database connected successfully' })
    }
  } catch (e) {
    results.push({ name: 'Connection', status: '❌', message: `Connection error: ${e.message}` })
  }

  // Check 2: Categories Table Schema
  console.log('2. Testing categories table schema...')
  const expectedColumns = ['id', 'name', 'hourly_rate', 'color', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by']
  const foundColumns = []
  const missingColumns = []

  for (const column of expectedColumns) {
    try {
      const { error } = await supabase
        .from('categories')
        .select(column)
        .limit(1)
      
      if (!error) {
        foundColumns.push(column)
      } else if (error.message.includes('does not exist')) {
        missingColumns.push(column)
      }
    } catch (e) {
      missingColumns.push(column)
    }
  }

  if (missingColumns.length === 0) {
    results.push({ name: 'Categories Schema', status: '✅', message: `All ${foundColumns.length} expected columns present` })
  } else {
    results.push({ name: 'Categories Schema', status: '⚠️', message: `Missing ${missingColumns.length} columns: ${missingColumns.join(', ')}` })
  }

  // Check 3: Authentication System
  console.log('3. Testing authentication system...')
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      results.push({ name: 'Authentication', status: '❌', message: `Auth error: ${error.message}` })
    } else {
      results.push({ name: 'Authentication', status: '✅', message: `Auth working (${data.users.length} users)` })
    }
  } catch (e) {
    results.push({ name: 'Authentication', status: '❌', message: `Auth error: ${e.message}` })
  }

  // Check 4: API Endpoints
  console.log('4. Testing API endpoints...')
  try {
    const response = await fetch('http://localhost:3000/api/categories?user_id=e01f256c-b3e4-4f1d-bd65-713a9e0a12cd')
    if (response.status === 500) {
      const errorData = await response.json()
      results.push({ name: 'Categories API', status: '❌', message: `500 error: ${errorData.error}` })
    } else {
      results.push({ name: 'Categories API', status: '✅', message: `Responding (${response.status})` })
    }
  } catch (e) {
    results.push({ name: 'Categories API', status: '❌', message: `Cannot reach API: ${e.message}` })
  }

  const duration = Date.now() - startTime
  
  // Print Results
  console.log('\n📊 Health Check Results')
  console.log('=' .repeat(50))
  
  const successful = results.filter(r => r.status === '✅').length
  const warnings = results.filter(r => r.status === '⚠️').length
  const errors = results.filter(r => r.status === '❌').length
  const healthScore = Math.round((successful / results.length) * 100)
  
  console.log(`Health Score: ${healthScore}%`)
  console.log(`✅ Success: ${successful}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`⏱️  Duration: ${duration}ms`)
  console.log()
  
  results.forEach(result => {
    console.log(`${result.status} ${result.name}: ${result.message}`)
  })
  
  // Recommendations
  if (errors > 0 || warnings > 0) {
    console.log('\n💡 Recommendations:')
    
    if (missingColumns.length > 0) {
      console.log('🔧 Run: npm run db:repair to fix schema issues')
    }
    
    if (results.some(r => r.name === 'Categories API' && r.status === '❌')) {
      console.log('🔄 Restart your development server')
    }
  }
  
  console.log('\n🏥 Health check completed!')
  
  // Exit with appropriate code
  const exitCode = errors > 0 ? 1 : 0
  process.exit(exitCode)
}

runHealthCheck().catch((error) => {
  console.error('Health check failed:', error.message)
  process.exit(1)
})
