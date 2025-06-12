import { NextApiRequest, NextApiResponse } from 'next'
import { getTaskComments, createComment } from '../../../../../lib/database/kanban-queries'

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
    const comments = await getTaskComments(taskId)
    
    return res.status(200).json({
      success: true,
      data: comments,
      count: comments.length
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
  const { content } = req.body

  // Validate required fields
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Content is required and must be a non-empty string' 
    })
  }

  const commentData = {
    task_id: taskId,
    content: content.trim()
  }

  try {
    const newComment = await createComment(commentData)
    
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