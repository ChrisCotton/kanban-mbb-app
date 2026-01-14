import { NextApiRequest, NextApiResponse } from 'next'
import { getTask, updateTask, deleteTask, Task } from '../../../../lib/database/kanban-queries'
import { validateUUID } from '../../../../lib/utils/uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' })
  }

  // Validate UUID format
  try {
    validateUUID(id, 'Task ID')
  } catch (error) {
    return res.status(400).json({ 
      error: error.message 
    })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetTask(req, res, id)
      case 'PUT':
        return await handleUpdateTask(req, res, id)
      case 'DELETE':
        return await handleDeleteTask(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
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

async function handleGetTask(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { include_details } = req.query
  const includeDetails = include_details === 'true'

  try {
    const task = await getTask(id, includeDetails)
    
    return res.status(200).json({
      success: true,
      data: task
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Task not found',
        id 
      })
    }
    throw error
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { title, description, status, priority, due_date, order_index, category_id } = req.body

  // Validate fields if provided
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ 
      error: 'Title must be a non-empty string' 
    })
  }

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

  if (due_date && due_date !== null && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ 
      error: 'Invalid due_date format. Use ISO 8601 format or null.' 
    })
  }

  if (order_index !== undefined && (typeof order_index !== 'number' || order_index < 0)) {
    return res.status(400).json({ 
      error: 'order_index must be a non-negative number' 
    })
  }

  // Validate category_id if provided
  if (category_id !== undefined && category_id !== null) {
    try {
      validateUUID(category_id, 'Category ID')
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid category_id format',
        message: error instanceof Error ? error.message : 'Invalid UUID'
      })
    }
  }

  // Build update object with only provided fields
  const updates: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>> = {}
  
  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (status !== undefined) updates.status = status
  if (priority !== undefined) updates.priority = priority
  if (due_date !== undefined) updates.due_date = due_date
  if (order_index !== undefined) updates.order_index = order_index
  if (category_id !== undefined) updates.category_id = category_id

  try {
    const updatedTask = await updateTask(id, updates)
    
    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Task not found',
        id 
      })
    }
    throw error
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    await deleteTask(id)
    
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      id
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Task not found',
        id 
      })
    }
    throw error
  }
} 