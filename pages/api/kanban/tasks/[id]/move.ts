import { NextApiRequest, NextApiResponse } from 'next'
import { moveTask, Task } from '../../../../../lib/database/kanban-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' })
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    return await handleMoveTask(req, res, id)
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleMoveTask(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { status, order_index } = req.body

  // Validate required fields
  if (!status) {
    return res.status(400).json({ 
      error: 'status is required for moving tasks' 
    })
  }

  if (order_index === undefined || order_index === null) {
    return res.status(400).json({ 
      error: 'order_index is required for moving tasks' 
    })
  }

  // Validate status
  const validStatuses = ['backlog', 'todo', 'doing', 'done']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status',
      validStatuses 
    })
  }

  // Validate order_index
  if (typeof order_index !== 'number' || order_index < 0) {
    return res.status(400).json({ 
      error: 'order_index must be a non-negative number' 
    })
  }

  try {
    const movedTask = await moveTask(id, status as Task['status'], order_index)
    
    return res.status(200).json({
      success: true,
      data: movedTask,
      message: `Task moved to ${status} at position ${order_index}`
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