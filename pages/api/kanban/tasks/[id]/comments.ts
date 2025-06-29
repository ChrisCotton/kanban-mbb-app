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
        return await handleGetComments(req, res, id)
      case 'POST':
        return await handleCreateComment(req, res, id)
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

async function handleGetComments(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }
    
    return res.status(200).json({
      success: true,
      data: comments || [],
      count: comments?.length || 0
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

async function handleCreateComment(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  const { content, user_id } = req.body

  // Validate required fields
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Content is required and must be a non-empty string' 
    })
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ 
      error: 'user_id is required' 
    })
  }

  const commentData = {
    task_id: taskId,
    content: content.trim(),
    user_id: user_id
  }

  try {
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }
    
    return res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment created successfully'
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