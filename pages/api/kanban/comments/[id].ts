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
    // Update the comment using service role client
    const { data, error } = await supabase
      .from('comments')
      .update({ 
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`)
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      // Check if comment exists
      const { data: existingComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', id)
        .single()

      if (!existingComment) {
        return res.status(404).json({ 
          error: 'Comment not found',
          id 
        })
      } else {
        return res.status(403).json({ 
          error: 'You don\'t have permission to update this comment',
          id 
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      data: data[0],
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
    // Delete the comment using service role client
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`)
    }
    
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