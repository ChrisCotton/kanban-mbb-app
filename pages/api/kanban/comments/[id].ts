import { NextApiRequest, NextApiResponse } from 'next'
import { updateComment, deleteComment } from '../../../../lib/database/kanban-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Comment ID is required' })
  }

  try {
    switch (req.method) {
      case 'PUT':
        return await handleUpdateComment(req, res, id)
      case 'DELETE':
        return await handleDeleteComment(req, res, id)
      default:
        res.setHeader('Allow', ['PUT', 'DELETE'])
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

async function handleUpdateComment(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { content } = req.body

  // Validate required fields
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Content is required and must be a non-empty string' 
    })
  }

  try {
    const updatedComment = await updateComment(id, content.trim())
    
    return res.status(200).json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Comment not found',
        id 
      })
    }
    throw error
  }
}

async function handleDeleteComment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    await deleteComment(id)
    
    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      id
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Comment not found',
        id 
      })
    }
    throw error
  }
} 