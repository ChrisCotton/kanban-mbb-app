#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🧪 Testing category creation...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCategoryCreation() {
  try {
    // First, let's check if there are any existing users
    console.log('1. Checking for existing users...')
    
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.log('❌ Cannot list users:', usersError.message)
      console.log('💡 Creating with a test UUID...')
      
      // Try creating with a properly formatted UUID
      const testUserId = '00000000-0000-4000-8000-000000000000'
      
      const testData = {
        name: 'Test Category Direct',
        hourly_rate: 50.00,
        color: '#3B82F6',
        is_active: true,
        created_by: testUserId,
        updated_by: testUserId
      }
      
      console.log('2. Attempting direct insert with test UUID...')
      const { data: result, error: insertError } = await supabase
        .from('categories')
        .insert(testData)
        .select()
      
      if (insertError) {
        console.log('❌ Direct insert failed:', insertError.message)
        console.log('Code:', insertError.code)
        
        // Try without user fields
        console.log('3. Trying without user fields...')
        const simpleData = {
          name: 'Test Category Simple',
          hourly_rate: 50.00,
          color: '#3B82F6',
          is_active: true
        }
        
        const { data: simpleResult, error: simpleError } = await supabase
          .from('categories')
          .insert(simpleData)
          .select()
        
        if (simpleError) {
          console.log('❌ Simple insert also failed:', simpleError.message)
          
          // Check table constraints
          console.log('4. Let me check what constraints exist...')
          const { data: constraintData, error: constraintError } = await supabase
            .rpc('get_table_constraints', { table_name: 'categories' })
          
          if (constraintError) {
            console.log('Cannot get constraints:', constraintError.message)
          } else {
            console.log('Table constraints:', constraintData)
          }
          
        } else {
          console.log('✅ Simple insert worked!')
          console.log('Created:', simpleResult)
          
          // Clean up
          if (simpleResult && simpleResult[0]) {
            await supabase.from('categories').delete().eq('id', simpleResult[0].id)
            console.log('🧹 Cleaned up test record')
          }
        }
        
      } else {
        console.log('✅ Direct insert worked!')
        console.log('Created:', result)
        
        // Clean up
        if (result && result[0]) {
          await supabase.from('categories').delete().eq('id', result[0].id)
          console.log('🧹 Cleaned up test record')
        }
      }
      
    } else {
      console.log(`✅ Found ${users.users.length} users`)
      
      if (users.users.length > 0) {
        const firstUser = users.users[0]
        console.log('Using first user ID:', firstUser.id)
        
        const testData = {
          name: 'Test Category With Real User',
          hourly_rate: 75.00,
          color: '#10B981',
          is_active: true,
          created_by: firstUser.id,
          updated_by: firstUser.id
        }
        
        console.log('2. Creating category with real user ID...')
        const { data: result, error: insertError } = await supabase
          .from('categories')
          .insert(testData)
          .select()
        
        if (insertError) {
          console.log('❌ Insert with real user failed:', insertError.message)
        } else {
          console.log('✅ Category created successfully!')
          console.log('Created:', result)
          
          // Test the API endpoint
          console.log('3. Testing API endpoint...')
          const response = await fetch(`http://localhost:3000/api/categories?user_id=${firstUser.id}`)
          const apiResult = await response.json()
          
          if (apiResult.success) {
            console.log('✅ API is working! Found categories:', apiResult.count)
          } else {
            console.log('❌ API still has issues:', apiResult.error)
          }
          
          // Clean up
          if (result && result[0]) {
            await supabase.from('categories').delete().eq('id', result[0].id)
            console.log('🧹 Cleaned up test record')
          }
        }
      } else {
        console.log('❌ No users found - need to create a user first')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testCategoryCreation()
  .then(() => {
    console.log('\n🎉 Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error.message)
    process.exit(1)
  }) 