const { createSupabaseClient } = require('./lib/env-loader')

async function testDatabase() {
  console.log('Testing database connection...')
  
  try {
    const supabase = createSupabaseClient()
    
    // Test 1: Check if categories table exists
    console.log('\n1. Testing categories table access...')
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Categories table error:', error)
    } else {
      console.log('Categories table accessible. Sample data:', data)
    }

    // Test 2: Try to insert a test category (without description field)
    console.log('\n2. Testing category insertion...')
    const testUserId = '550e8400-e29b-41d4-a716-446655440000' // dummy UUID
    
    const { data: insertData, error: insertError } = await supabase
      .from('categories')
      .insert({
        name: 'Test Category',
        hourly_rate_usd: 50.00,
        is_active: true,
        created_by: testUserId,
        updated_by: testUserId
      })
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
    } else {
      console.log('Insert successful:', insertData)
      
      // Clean up
      if (insertData && insertData[0]) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', insertData[0].id)
        console.log('Test record cleaned up')
      }
    }

  } catch (err) {
    console.error('Database test failed:', err)
  }
}

testDatabase().then(() => {
  console.log('\nDatabase test complete')
  process.exit(0)
}) 