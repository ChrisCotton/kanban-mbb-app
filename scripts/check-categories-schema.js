#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Checking categories table schema...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  try {
    // Method 1: Try to get table info using information_schema
    console.log('1. Checking if table exists...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'categories')
    
    if (tablesError) {
      console.log('❌ Cannot access information_schema:', tablesError.message)
    } else if (!tables || tables.length === 0) {
      console.log('❌ Categories table does not exist!')
      return 'NO_TABLE'
    } else {
      console.log('✅ Categories table exists')
    }
    
    // Method 2: Check columns
    console.log('2. Checking table columns...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'categories')
      .order('ordinal_position')
    
    if (columnsError) {
      console.log('❌ Cannot get column info:', columnsError.message)
    } else if (columns && columns.length > 0) {
      console.log('✅ Found columns:')
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`)
      })
      return columns
    }
    
    // Method 3: Try basic query to see what happens
    console.log('3. Testing basic table access...')
    
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Cannot query table:', testError.message)
      if (testError.code === '42P01') {
        return 'NO_TABLE'
      }
    } else {
      console.log('✅ Can query table, sample data:', testData)
      return 'ACCESSIBLE'
    }
    
    // Method 4: Try simple column test
    console.log('4. Testing specific columns...')
    
    const testColumns = ['id', 'name', 'hourly_rate_usd', 'description', 'created_at']
    const existingColumns = []
    
    for (const col of testColumns) {
      try {
        const { error } = await supabase
          .from('categories')
          .select(col)
          .limit(1)
        
        if (!error) {
          existingColumns.push(col)
          console.log(`   ✅ ${col} exists`)
        }
      } catch (e) {
        console.log(`   ❌ ${col} missing`)
      }
    }
    
    return existingColumns
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message)
    return 'ERROR'
  }
}

checkSchema()
  .then((result) => {
    console.log('\n📋 Schema Check Summary:')
    console.log('Result:', result)
    
    if (result === 'NO_TABLE') {
      console.log('\n💡 Next Steps:')
      console.log('   1. Go to https://app.supabase.com')
      console.log('   2. Open your project')
      console.log('   3. Go to SQL Editor')
      console.log('   4. Run the categories table creation SQL')
    } else if (Array.isArray(result) && result.length > 0) {
      console.log('\n💡 Found these columns:', result.join(', '))
      console.log('   Need to update API to use only existing columns')
    }
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('Process failed:', error.message)
    process.exit(1)
  }) 