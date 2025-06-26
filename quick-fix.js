// Quick fix script
const { createSupabaseClient } = require('./lib/env-loader')

async function quickFix() {
  console.log('=== QUICK DATABASE FIX ===')
  
  try {
    const supabase = createSupabaseClient()
    console.log('✅ Supabase client created')
    
    // Test 1: Check if we can select from categories at all
    console.log('\n1. Testing basic table access...')
    const { data: selectTest, error: selectError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.log('❌ Cannot select from categories:', selectError)
    } else {
      console.log('✅ Can select from categories:', selectTest)
    }
    
    // Test 2: Try minimal insert
    console.log('\n2. Testing minimal insert...')
    const testData = {
      name: 'Test Category 123',
      created_by: '550e8400-e29b-41d4-a716-446655440000'
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('categories')
      .insert(testData)
      .select()
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError)
      
      // Try with more fields based on common requirements
      console.log('\n2b. Trying with additional fields...')
      const fullData = {
        name: 'Test Category 456',
        hourly_rate_usd: 50.0,
        is_active: true,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        updated_by: '550e8400-e29b-41d4-a716-446655440000'
      }
      
      const { data: fullResult, error: fullError } = await supabase
        .from('categories')
        .insert(fullData)
        .select()
      
      if (fullError) {
        console.log('❌ Full insert also failed:', fullError)
      } else {
        console.log('✅ Full insert worked:', fullResult)
        
        // Clean up
        if (fullResult && fullResult[0]) {
          await supabase.from('categories').delete().eq('id', fullResult[0].id)
          console.log('🧹 Cleaned up test data')
        }
      }
    } else {
      console.log('✅ Minimal insert worked:', insertResult)
      
      // Clean up
      if (insertResult && insertResult[0]) {
        await supabase.from('categories').delete().eq('id', insertResult[0].id)
        console.log('🧹 Cleaned up test data')
      }
    }
    
  } catch (error) {
    console.log('❌ Script failed:', error)
  }
  
  console.log('\n=== FIX COMPLETE ===')
}

quickFix().catch(console.error)