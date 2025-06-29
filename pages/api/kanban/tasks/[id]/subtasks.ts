import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetSubtasks(req, res, id)
      case 'POST':
        return await handleCreateSubtask(req, res, id)
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

async function handleGetSubtasks(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  try {
    const { data: subtasks, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch subtasks: ${error.message}`)
    }
    
    return res.status(200).json({
      success: true,
      data: subtasks || [],
      count: subtasks?.length || 0,
      completed: subtasks?.filter(s => s.completed).length || 0
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Task not found',
        taskId 
      })
    }
    throw error
  }
}

async function handleCreateSubtask(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  const { title, order_index, user_id } = req.body

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

  // Validate order_index if provided
  if (order_index !== undefined && (typeof order_index !== 'number' || order_index < 0)) {
    return res.status(400).json({ 
      error: 'order_index must be a non-negative number' 
    })
  }

  const subtaskData = {
    task_id: taskId,
    title: title.trim(),
    completed: false,
    order_index: order_index || 0,
    user_id: user_id
  }

  try {
    const { data: newSubtask, error } = await supabase
      .from('subtasks')
      .insert([subtaskData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create subtask: ${error.message}`)
    }
    
    return res.status(201).json({
      success: true,
      data: newSubtask,
      message: 'Subtask created successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Task not found',
        taskId 
      })
    }
    throw error
  }
} 