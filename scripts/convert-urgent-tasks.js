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

async function convertUrgentTasks() {
  console.log('🔧 Converting urgent priority tasks to high priority...')
  
  try {
    // Get all tasks to check their priorities
    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, priority, status')
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError.message)
      return
    }
    
    console.log(`📊 Found ${allTasks.length} total tasks`)
    
    // Show priority distribution
    const priorityCount = allTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {})
    
    console.log('📋 Priority distribution:')
    Object.entries(priorityCount).forEach(([priority, count]) => {
      console.log(`  - ${priority}: ${count} tasks`)
    })
    
    // Check for any tasks that might have invalid priorities
    const validPriorities = ['low', 'medium', 'high']
    const invalidTasks = allTasks.filter(task => !validPriorities.includes(task.priority))
    
    if (invalidTasks.length > 0) {
      console.log(`🔄 Found ${invalidTasks.length} tasks with invalid priorities:`)
      
      for (const task of invalidTasks) {
        console.log(`  - Converting "${task.title}" from "${task.priority}" to "high"`)
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ priority: 'high' })
          .eq('id', task.id)
        
        if (updateError) {
          console.log(`    ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log(`    ✅ Successfully updated`)
        }
      }
      
      console.log('✅ All invalid priority tasks have been converted to high priority')
    } else {
      console.log('✅ All tasks already have valid priorities (low, medium, high)')
    }
    
    // Test creating a task with each valid priority
    console.log('🧪 Testing task creation with valid priorities...')
    
    const testTasks = [
      { title: 'Test Low Priority', priority: 'low' },
      { title: 'Test Medium Priority', priority: 'medium' },
      { title: 'Test High Priority', priority: 'high' }
    ]
    
    for (const testTask of testTasks) {
      const { data: result, error: createError } = await supabase
        .from('tasks')
        .insert([{
          ...testTask,
          description: 'Test task for priority validation',
          status: 'backlog',
          order_index: 999
        }])
        .select()
      
      if (createError) {
        console.log(`❌ Failed to create ${testTask.priority} priority task: ${createError.message}`)
      } else {
        console.log(`✅ Successfully created ${testTask.priority} priority task`)
        
        // Clean up test task
        await supabase
          .from('tasks')
          .delete()
          .eq('id', result[0].id)
      }
    }
    
    console.log('✅ Priority conversion completed!')
    console.log('🚀 Task updates should now work properly!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

convertUrgentTasks() 