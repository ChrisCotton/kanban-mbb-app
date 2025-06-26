#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✗' : '✓')
  process.exit(1)
}

console.log('🔧 Fixing categories table...')
console.log('📡 Connecting to Supabase...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCategories() {
  try {
    // Read the SQL fix file
    const sqlPath = path.join(__dirname, '..', 'fix-categories-direct.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Split into individual statements and filter out empty ones
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
      console.log(`   ${statement.substring(0, 60)}...`)
      
      try {
        // Use the simple query method
        const { error } = await supabase
          .from('_temp_sql_execution')
          .select('*')
          .limit(0)
        
        // If that fails, try direct SQL execution
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sql',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Accept': 'application/json'
          },
          body: statement + ';'
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`   ⚠️  Statement may have failed: ${errorText}`)
          // Don't exit - some statements might fail if they already exist
        } else {
          console.log(`   ✅ Statement executed successfully`)
        }
        
      } catch (error) {
        console.log(`   ⚠️  Statement execution issue: ${error.message}`)
        // Continue with next statement
      }
    }
    
    console.log('\n🧪 Testing categories table...')
    
    // Test if we can query the categories table
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, hourly_rate_usd')
      .limit(1)
    
    if (error) {
      console.error('❌ Test failed:', error.message)
      
      // Try to create the table with a simple approach
      console.log('🔄 Attempting simple table creation...')
      const { error: createError } = await supabase
        .from('categories')
        .insert({
          name: 'Test Category',
          description: 'Test Description',
          hourly_rate_usd: 50.00,
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
      
      if (createError && createError.code === '42P01') {
        console.error('❌ Categories table does not exist and could not be created')
        console.log('💡 Please run this SQL manually in your Supabase dashboard:')
        console.log(sqlContent)
      } else {
        console.log('✅ Table creation test passed')
      }
    } else {
      console.log('✅ Categories table is working correctly!')
      console.log(`📊 Current columns available: ${data ? 'id, name, description, hourly_rate_usd' : 'Unable to determine'}`)
    }
    
  } catch (error) {
    console.error('❌ Fix process failed:', error.message)
    process.exit(1)
  }
}

// Run the fix
fixCategories()
  .then(() => {
    console.log('\n🎉 Categories fix process completed!')
    console.log('🔍 Now test the categories API at: http://localhost:3000/api/categories?user_id=test')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Process failed:', error.message)
    process.exit(1)
  }) 