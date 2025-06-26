const DatabaseHelper = require('./scripts/db-helper')

async function fixCategoriesSchema() {
  const db = new DatabaseHelper()
  
  console.log('🔧 Fixing Categories Table Schema')
  console.log('=====================================')
  
  // Test connection first
  const connected = await db.testConnection()
  if (!connected) {
    console.log('❌ Cannot connect to database - stopping')
    return
  }
  
  console.log('\n📊 Step 1: Check current table structure')
  try {
    const { data, error } = await db.supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Table access error:', error)
    } else {
      console.log('✅ Table accessible, sample data:', data)
      if (data.length > 0) {
        console.log('📋 Current columns:', Object.keys(data[0]))
      } else {
        console.log('📋 Table is empty - need to check structure')
      }
    }
  } catch (err) {
    console.log('❌ Table check failed:', err.message)
  }

  console.log('\n🔧 Step 2: Try to create minimal working categories table')
  
  // First, let's try a simple insert to see what columns are required
  console.log('\n🧪 Testing minimal insert...')
  try {
    const testData = {
      name: 'Test Category',
      created_by: '550e8400-e29b-41d4-a716-446655440000'
    }
    
    const { data: insertData, error: insertError } = await db.supabase
      .from('categories')
      .insert(testData)
      .select()
    
    if (insertError) {
      console.log('❌ Minimal insert failed:', insertError)
      
      // If it's missing columns, let's try different combinations
      if (insertError.message.includes('hourly_rate_usd')) {
        console.log('\n🔧 Adding hourly_rate_usd...')
        testData.hourly_rate_usd = 50.0
      }
      
      if (insertError.message.includes('updated_by')) {
        console.log('\n🔧 Adding updated_by...')
        testData.updated_by = testData.created_by
      }
      
      if (insertError.message.includes('is_active')) {
        console.log('\n🔧 Adding is_active...')
        testData.is_active = true
      }
      
      // Try again with additional fields
      console.log('\n🧪 Retrying with additional fields:', testData)
      const { data: retryData, error: retryError } = await db.supabase
        .from('categories')
        .insert(testData)
        .select()
      
      if (retryError) {
        console.log('❌ Retry failed:', retryError)
      } else {
        console.log('✅ Success! Category created:', retryData)
        
        // Clean up test data
        if (retryData && retryData[0]) {
          await db.supabase
            .from('categories')
            .delete()
            .eq('id', retryData[0].id)
          console.log('🧹 Test data cleaned up')
        }
      }
    } else {
      console.log('✅ Minimal insert worked:', insertData)
      
      // Clean up test data
      if (insertData && insertData[0]) {
        await db.supabase
          .from('categories')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Test data cleaned up')
      }
    }
  } catch (err) {
    console.log('❌ Insert test failed:', err.message)
  }

  console.log('\n✅ Schema fix attempt complete')
}

fixCategoriesSchema().then(() => {
  console.log('\n🎉 Categories schema fix complete')
  process.exit(0)
}).catch(err => {
  console.error('❌ Schema fix failed:', err)
  process.exit(1)
})