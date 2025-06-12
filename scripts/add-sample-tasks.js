const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('Environment check:')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sampleTasks = [
  {
    title: 'Set up project structure',
    description: 'Create the basic folder structure and configuration files for the kanban board project.',
    status: 'done',
    priority: 'high',
    due_date: '2025-01-10',
    mbb_impact: 50,
    order_index: 0
  },
  {
    title: 'Design database schema',
    description: 'Create tables for tasks, comments, and subtasks with proper relationships.',
    status: 'done',
    priority: 'high',
    due_date: '2025-01-12',
    mbb_impact: 75,
    order_index: 1
  },
  {
    title: 'Implement API endpoints',
    description: 'Create REST API endpoints for CRUD operations on tasks, comments, and subtasks.',
    status: 'done',
    priority: 'medium',
    due_date: '2025-01-15',
    mbb_impact: 100,
    order_index: 2
  },
  {
    title: 'Build kanban board UI',
    description: 'Create the main kanban board component with four swim lanes and drag-and-drop functionality.',
    status: 'doing',
    priority: 'high',
    due_date: '2025-01-18',
    mbb_impact: 150,
    order_index: 0
  },
  {
    title: 'Add task creation modal',
    description: 'Create a modal dialog for adding new tasks with all required fields.',
    status: 'todo',
    priority: 'medium',
    due_date: '2025-01-20',
    mbb_impact: 75,
    order_index: 0
  },
  {
    title: 'Implement drag and drop',
    description: 'Add drag and drop functionality to move tasks between swim lanes.',
    status: 'todo',
    priority: 'high',
    due_date: '2025-01-22',
    mbb_impact: 100,
    order_index: 1
  },
  {
    title: 'Add comments system',
    description: 'Allow users to add comments to tasks for better collaboration.',
    status: 'todo',
    priority: 'medium',
    due_date: '2025-01-25',
    mbb_impact: 50,
    order_index: 2
  },
  {
    title: 'Create subtasks feature',
    description: 'Allow breaking down tasks into smaller subtasks with progress tracking.',
    status: 'backlog',
    priority: 'medium',
    due_date: '2025-01-28',
    mbb_impact: 75,
    order_index: 0
  },
  {
    title: 'Implement MBB calculations',
    description: 'Add mental bank balance calculations based on task completion and impact.',
    status: 'backlog',
    priority: 'high',
    due_date: '2025-01-30',
    mbb_impact: 200,
    order_index: 1
  },
  {
    title: 'Add analytics dashboard',
    description: 'Create charts and metrics to track productivity and MBB over time.',
    status: 'backlog',
    priority: 'low',
    due_date: '2025-02-05',
    mbb_impact: 100,
    order_index: 2
  }
]

async function addSampleTasks() {
  try {
    console.log('Adding sample tasks to database...')
    
    // First, let's test the connection
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('Connection test failed:', testError)
      return
    }

    console.log('Database connection successful')
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(sampleTasks)
      .select()

    if (error) {
      console.error('Error adding sample tasks:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return
    }

    console.log(`Successfully added ${data.length} sample tasks:`)
    data.forEach(task => {
      console.log(`- ${task.title} (${task.status})`)
    })

    console.log('\nSample tasks added successfully! 🎉')
    console.log('You can now test your kanban board at http://localhost:3000/dashboard')
    
  } catch (err) {
    console.error('Unexpected error:', err)
    console.error('Error stack:', err.stack)
  }
}

addSampleTasks() 