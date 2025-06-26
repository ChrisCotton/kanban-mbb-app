const { createSupabaseClient } = require('./lib/env-loader')

async function disableRLS() {
  console.log('🔧 Disabling RLS on categories table...')
  
  try {
    const supabase = createSupabaseClient()
    
    // Try to run SQL directly using a query (since rpc might not be available)
    console.log('Attempting to disable RLS...')
    
    // Since we can't use rpc, let's test the current state first
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Current table access error:', testError)
      console.log('This suggests RLS is blocking access')
    } else {
      console.log('✅ Table is accessible:', testData)
    }
    
    // Test insert to see exact error
    console.log('\nTesting insert with proper schema...')
    const testInsert = {
      name: 'RLS Test Category',
      hourly_rate_usd: 50.0,
      is_active: true,
      created_by: '550e8400-e29b-41d4-a716-446655440000',
      updated_by: '550e8400-e29b-41d4-a716-446655440000'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('categories')
      .insert(testInsert)
      .select()
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError)
      console.log('Error code:', insertError.code)
      console.log('Error message:', insertError.message)
      
      if (insertError.code === '42501' || insertError.message.includes('policy')) {
        console.log('🛡️ This is definitely a RLS policy issue')
        console.log('💡 You need to run this SQL in your Supabase dashboard:')
        console.log('   ALTER TABLE categories DISABLE ROW LEVEL SECURITY;')
      }
    } else {
      console.log('✅ Insert worked! RLS is not the issue:', insertData)
      
      // Clean up
      if (insertData && insertData[0]) {
        await supabase.from('categories').delete().eq('id', insertData[0].id)
        console.log('🧹 Cleaned up test data')
      }
    }
    
  } catch (error) {
    console.log('❌ Script error:', error)
  }
}

disableRLS().catch(console.error)