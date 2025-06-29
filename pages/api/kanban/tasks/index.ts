import { NextApiRequest, NextApiResponse } from 'next'
import { getTasks, createTask, Task } from '../../../../lib/database/kanban-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetTasks(req, res)
      case 'POST':
        return await handleCreateTask(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetTasks(req: NextApiRequest, res: NextApiResponse) {
  const { status } = req.query
  
  // Validate status parameter if provided
  const validStatuses = ['backlog', 'todo', 'doing', 'done']
  if (status && !validStatuses.includes(status as string)) {
    return res.status(400).json({ 
      error: 'Invalid status parameter',
      validStatuses 
    })
  }

  const tasks = await getTasks(status as Task['status'])
  
  return res.status(200).json({
    success: true,
    data: tasks,
    count: tasks.length
  })
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse) {
  const { title, description, status, priority, due_date, order_index, user_id } = req.body

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Title is required and must be a non-empty string' 
    })
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ 
      error: 'user_id is required' 
    })
  }

  // Validate optional fields
  const validStatuses = ['backlog', 'todo', 'doing', 'done']
  const validPriorities = ['low', 'medium', 'high', 'urgent']

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status',
      validStatuses 
    })
  }

  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ 
      error: 'Invalid priority',
      validPriorities 
    })
  }

  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ 
      error: 'Invalid due_date format. Use ISO 8601 format.' 
    })
  }

  if (order_index !== undefined && (typeof order_index !== 'number' || order_index < 0)) {
    return res.status(400).json({ 
      error: 'order_index must be a non-negative number' 
    })
  }

  const taskData = {
    title: title.trim(),
    description: description?.trim() || undefined,
    status: status || 'backlog',
    priority: priority || 'medium',
    due_date: due_date || undefined,
    order_index: order_index || 0,
    user_id: user_id
  }

  const newTask = await createTask(taskData)
  
  return res.status(201).json({
    success: true,
    data: newTask,
    message: 'Task created successfully'
  })
} 