#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addUrgentPriority() {
  console.log('🔧 Adding urgent priority to task_priority enum...')
  
  try {
    // Execute the ALTER TYPE command to add 'urgent' to the enum
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "ALTER TYPE task_priority ADD VALUE 'urgent';"
    })
    
    if (error) {
      // If the RPC function doesn't exist, try alternative approach
      console.log('⚠️  Direct SQL execution not available, trying alternative approach...')
      
      // Test if urgent priority already works by trying to create a test task
      const testTask = {
        title: 'Test Urgent Priority Task',
        description: 'Testing if urgent priority works',
        status: 'backlog',
        priority: 'urgent',
        order_index: 999
      }
      
      const { data: testResult, error: testError } = await supabase
        .from('tasks')
        .insert([testTask])
        .select()
      
      if (testError) {
        console.error('❌ Urgent priority is not supported yet.')
        console.error('Error:', testError.message)
        console.log('\n📋 Manual Steps Required:')
        console.log('1. Go to your Supabase Dashboard')
        console.log('2. Navigate to SQL Editor')
        console.log('3. Run this command:')
        console.log('   ALTER TYPE task_priority ADD VALUE \'urgent\';')
        console.log('4. Click "Run" to execute')
        return
      } else {
        console.log('✅ Urgent priority is already supported!')
        
        // Clean up the test task
        await supabase
          .from('tasks')
          .delete()
          .eq('id', testResult[0].id)
        
        console.log('🧹 Cleaned up test task')
      }
    } else {
      console.log('✅ Successfully added urgent priority to enum!')
    }

    // Verify the enum values
    console.log('🔍 Verifying enum values...')
    
    const { data: enumData, error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT enumlabel as priority_value 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_priority')
        ORDER BY enumsortorder;
      `
    })
    
    if (!enumError && enumData) {
      console.log('📋 Current priority values:', enumData.map(row => row.priority_value))
    }

    console.log('✅ Urgent priority enum update completed!')
    console.log('🚀 You can now use "urgent" priority in your tasks!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 Manual Steps Required:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run this command:')
    console.log('   ALTER TYPE task_priority ADD VALUE \'urgent\';')
    console.log('4. Click "Run" to execute')
  }
}

// Run the function
addUrgentPriority()
  .then(() => {
    console.log('🎉 Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }) 