#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🕵️ Discovering categories table columns...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function discoverColumns() {
  // Common column names to test
  const testColumns = [
    'id', 'name', 'description', 'hourly_rate_usd', 'hourly_rate', 'rate',
    'color', 'icon', 'is_active', 'active', 'created_at', 'updated_at',
    'created_by', 'updated_by', 'user_id'
  ]
  
  const existingColumns = []
  
  console.log('Testing common column names...')
  
  for (const col of testColumns) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(col)
        .limit(1)
      
      if (!error) {
        existingColumns.push(col)
        console.log(`✅ ${col}`)
      } else {
        console.log(`❌ ${col} - ${error.message}`)
      }
    } catch (e) {
      console.log(`❌ ${col} - ${e.message}`)
    }
  }
  
  console.log('\n🎯 Discovered existing columns:')
  console.log(existingColumns.join(', '))
  
  // Test if we can insert a minimal record
  if (existingColumns.includes('name')) {
    console.log('\n🧪 Testing minimal insert...')
    
    const insertData = { name: 'Test Discovery Category' }
    
    // Add any required columns we found
    if (existingColumns.includes('created_by')) {
      insertData.created_by = '550e8400-e29b-41d4-a716-446655440000'
    }
    if (existingColumns.includes('user_id')) {
      insertData.user_id = '550e8400-e29b-41d4-a716-446655440000'
    }
    if (existingColumns.includes('hourly_rate_usd')) {
      insertData.hourly_rate_usd = 50.00
    }
    if (existingColumns.includes('hourly_rate')) {
      insertData.hourly_rate = 50.00
    }
    if (existingColumns.includes('rate')) {
      insertData.rate = 50.00
    }
    
    console.log('Attempting to insert:', insertData)
    
    const { data: newRecord, error: insertError } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message)
      console.log('Error code:', insertError.code)
      console.log('Error details:', insertError.details)
    } else {
      console.log('✅ Insert successful!')
      console.log('New record:', newRecord)
      
      // Clean up
      if (newRecord && newRecord[0] && existingColumns.includes('id')) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', newRecord[0].id)
        console.log('🧹 Test record cleaned up')
      }
    }
  }
  
  return existingColumns
}

discoverColumns()
  .then((columns) => {
    console.log('\n📋 Final Results:')
    console.log(`Found ${columns.length} accessible columns:`, columns)
    
    if (columns.length > 0) {
      console.log('\n💡 Next step: Update your API to use only these columns')
      
      // Generate API-compatible select string
      const selectString = columns.join(',\n        ')
      console.log('\n📝 Use this select statement in your API:')
      console.log(`      .select(\`
        ${selectString}
      \`)`)
    }
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('Discovery failed:', error.message)
    process.exit(1)
  }) 