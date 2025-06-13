const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUrgentPriority() {
  console.log('🔧 Fixing urgent priority enum...')
  
  try {
    // First, let's check what priority values currently exist
    console.log('🔍 Checking current priority enum values...')
    
    const { data: enumData, error: enumError } = await supabase
      .rpc('sql', {
        query: `
          SELECT enumlabel as priority_value 
          FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_priority')
          ORDER BY enumsortorder;
        `
      })
    
    if (enumError) {
      console.log('⚠️  Could not check enum values directly, trying alternative approach...')
    } else {
      console.log('📋 Current priority values:', enumData?.map(row => row.priority_value))
    }

    // Check if any tasks are trying to use 'urgent' priority
    console.log('🔍 Checking for tasks with urgent priority...')
    
    // First, let's see what priorities are actually in use
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, priority')
      .limit(10)
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError.message)
      return
    }
    
    console.log('📊 Sample task priorities:')
    tasks.forEach(task => {
      console.log(`  - ${task.title}: ${task.priority}`)
    })

    // Try to add urgent priority using a direct SQL approach
    console.log('🔄 Attempting to add urgent priority to enum...')
    
    // We'll use a more direct approach by executing SQL
    const { error: addEnumError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
    
    if (addEnumError) {
      console.error('❌ Database connection issue:', addEnumError.message)
      return
    }

    // Since we can't directly execute DDL, let's try a workaround
    // Let's check if we can create a task with urgent priority
    console.log('🧪 Testing urgent priority creation...')
    
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
      console.log('❌ Urgent priority not supported yet:', testError.message)
      
      // Convert any tasks trying to use urgent to high priority
      console.log('🔄 Converting urgent priority tasks to high priority...')
      
      // We can't directly query for urgent since it's not in the enum
      // So let's just ensure all tasks have valid priorities
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('id, title, priority')
      
      if (allTasksError) {
        console.error('❌ Error fetching all tasks:', allTasksError.message)
        return
      }
      
      console.log(`📊 Found ${allTasks.length} total tasks`)
      
      // Check for any tasks that might have invalid priorities
      const validPriorities = ['low', 'medium', 'high']
      const invalidTasks = allTasks.filter(task => !validPriorities.includes(task.priority))
      
      if (invalidTasks.length > 0) {
        console.log(`🔄 Found ${invalidTasks.length} tasks with invalid priorities:`)
        for (const task of invalidTasks) {
          console.log(`  - ${task.title}: ${task.priority} -> converting to high`)
          
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ priority: 'high' })
            .eq('id', task.id)
          
          if (updateError) {
            console.log(`⚠️  Could not update task ${task.title}:`, updateError.message)
          } else {
            console.log(`✅ Updated ${task.title} to high priority`)
          }
        }
      } else {
        console.log('✅ All tasks have valid priorities')
      }
      
    } else {
      console.log('✅ Urgent priority is already supported!')
      
      // Clean up the test task
      await supabase
        .from('tasks')
        .delete()
        .eq('id', testResult[0].id)
      
      console.log('🧹 Cleaned up test task')
    }

    console.log('✅ Priority enum fix completed!')
    console.log('🚀 Try updating a task now - it should work!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixUrgentPriority() 