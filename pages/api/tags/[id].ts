import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { validateUUID } from '../../../lib/utils/uuid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Tag ID is required' })
    }

    // Validate UUID format
    try {
      validateUUID(id, 'Tag ID')
    } catch (error) {
      return res.status(400).json({ 
        error: error.message 
      })
    }

    if (req.method === 'PUT') {
      return await handleUpdateTag(req, res, id)
    } else if (req.method === 'DELETE') {
      return await handleDeleteTag(req, res, id)
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Tag API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleUpdateTag(req: NextApiRequest, res: NextApiResponse, tagId: string) {
  const { name, color, user_id } = req.body

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Validation
  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 50) {
      return res.status(400).json({ error: 'Tag name must be between 1 and 50 characters' })
    }
  }

  if (color !== undefined) {
    if (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex color code' })
    }
  }

  // Check if tag exists and belongs to user
  const { data: existingTag, error: checkError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('id', tagId)
    .eq('created_by', user_id)
    .single()

  if (checkError || !existingTag) {
    return res.status(404).json({ error: 'Tag not found' })
  }

  // If name is being updated, check for duplicates
  if (name && name.trim() !== existingTag.name) {
    const { data: duplicateTag, error: duplicateError } = await supabase
      .from('tags')
      .select('id')
      .eq('created_by', user_id)
      .eq('name', name.trim())
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('Error checking duplicate tag:', duplicateError)
      return res.status(500).json({ error: 'Failed to check duplicate tag' })
    }

    if (duplicateTag) {
      return res.status(409).json({ error: 'A tag with this name already exists' })
    }
  }

  // Prepare update data
  const updateData: any = {}
  if (name !== undefined) updateData.name = name.trim()
  if (color !== undefined) updateData.color = color

  // Update the tag
  const { data: tag, error } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', tagId)
    .eq('created_by', user_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating tag:', error)
    return res.status(500).json({ error: 'Failed to update tag' })
  }

  return res.status(200).json({ tag })
}

async function handleDeleteTag(req: NextApiRequest, res: NextApiResponse, tagId: string) {
  const { user_id } = req.body

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Check if tag exists and belongs to user
  const { data: existingTag, error: checkError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('created_by', user_id)
    .single()

  if (checkError || !existingTag) {
    return res.status(404).json({ error: 'Tag not found' })
  }

  // Delete the tag (task_tags will be deleted automatically due to CASCADE)
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('created_by', user_id)

  if (error) {
    console.error('Error deleting tag:', error)
    return res.status(500).json({ error: 'Failed to delete tag' })
  }

  return res.status(200).json({ message: 'Tag deleted successfully' })
} 