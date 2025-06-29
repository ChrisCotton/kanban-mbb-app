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
    return res.status(400).json({ error: 'Subtask ID is required' })
  }

  try {
    switch (req.method) {
      case 'PUT':
        return await handleUpdateSubtask(req, res, id)
      case 'PATCH':
        return await handleToggleSubtask(req, res, id)
      case 'DELETE':
        return await handleDeleteSubtask(req, res, id)
      default:
        res.setHeader('Allow', ['PUT', 'PATCH', 'DELETE'])
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

async function handleUpdateSubtask(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { title, completed, order_index } = req.body

  // Validate fields if provided
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ 
      error: 'Title must be a non-empty string' 
    })
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ 
      error: 'Completed must be a boolean' 
    })
  }

  if (order_index !== undefined && (typeof order_index !== 'number' || order_index < 0)) {
    return res.status(400).json({ 
      error: 'order_index must be a non-negative number' 
    })
  }

  // Build update object with only provided fields
  const updates: any = {}
  
  if (title !== undefined) updates.title = title.trim()
  if (completed !== undefined) updates.completed = completed
  if (order_index !== undefined) updates.order_index = order_index

  try {
    const { data: updatedSubtask, error } = await supabase
      .from('subtasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update subtask: ${error.message}`)
    }
    
    return res.status(200).json({
      success: true,
      data: updatedSubtask,
      message: 'Subtask updated successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Subtask not found',
        id 
      })
    }
    throw error
  }
}

async function handleToggleSubtask(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // First get the current status
    const { data: subtask, error: fetchError } = await supabase
      .from('subtasks')
      .select('completed')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch subtask: ${fetchError.message}`)
    }

    // Toggle the completion status
    const { data: toggledSubtask, error } = await supabase
      .from('subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to toggle subtask: ${error.message}`)
    }
    
    return res.status(200).json({
      success: true,
      data: toggledSubtask,
      message: `Subtask ${toggledSubtask.completed ? 'completed' : 'uncompleted'}`
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Subtask not found',
        id 
      })
    }
    throw error
  }
}

async function handleDeleteSubtask(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete subtask: ${error.message}`)
    }
    
    return res.status(200).json({
      success: true,
      message: 'Subtask deleted successfully',
      id
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Subtask not found',
        id 
      })
    }
    throw error
  }
} 