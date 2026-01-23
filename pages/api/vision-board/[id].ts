import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Vision board image ID is required' })
  }

  try {
    switch (method) {
      case 'GET':
        return await getVisionBoardImage(req, res, id)
      case 'PUT':
        return await updateVisionBoardImage(req, res, id)
      case 'DELETE':
        return await deleteVisionBoardImage(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Vision board image API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getVisionBoardImage(req: NextApiRequest, res: NextApiResponse, imageId: string) {
  const { user_id, increment_view = 'false' } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    const { data: image, error } = await supabase
      .from('vision_board_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', user_id)
      .single()

    if (error || !image) {
      return res.status(404).json({ error: 'Vision board image not found' })
    }

    // Increment view count if requested
    if (increment_view === 'true') {
      await supabase
        .from('vision_board_images')
        .update({ 
          view_count: (image.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', imageId)
        .eq('user_id', user_id)

      // Update the returned data
      image.view_count = (image.view_count || 0) + 1
      image.last_viewed_at = new Date().toISOString()
    }

    return res.status(200).json({
      success: true,
      data: image
    })

  } catch (error) {
    console.error('Error fetching vision board image:', error)
    return res.status(500).json({ error: 'Failed to fetch vision board image' })
  }
}

async function updateVisionBoardImage(req: NextApiRequest, res: NextApiResponse, imageId: string) {
  const { 
    user_id,
    title,
    description,
    is_active,
    display_order,
    tags,
    action,
    goal,
    due_date
  } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Verify image exists and user owns it
    const { data: existingImage } = await supabase
      .from('vision_board_images')
      .select('id, is_active, display_order, goal, due_date')
      .eq('id', imageId)
      .eq('user_id', user_id)
      .single()

    if (!existingImage) {
      return res.status(404).json({ error: 'Vision board image not found or access denied' })
    }

    // Handle special actions
    if (action === 'activate') {
      return await activateImage(res, imageId, user_id)
    } else if (action === 'deactivate') {
      return await deactivateImage(res, imageId, user_id)
    } else if (action === 'reorder') {
      return await reorderImage(res, imageId, user_id, display_order)
    }

    // General update
    const updateData: any = {}

    if (title !== undefined) {
      updateData.title = title.trim() || 'Untitled'
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    if (display_order !== undefined) {
      const orderNum = parseInt(display_order)
      if (!isNaN(orderNum) && orderNum >= 0) {
        updateData.display_order = orderNum
      }
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updateData.tags = tags.filter(Boolean)
      } else if (typeof tags === 'string') {
        updateData.tags = tags.split(',').map(t => t.trim()).filter(Boolean)
      } else {
        updateData.tags = null
      }
    }

    // Handle goal update
    if (goal !== undefined) {
      if (goal === null) {
        return res.status(400).json({ error: 'goal cannot be set to null' })
      }
      const trimmedGoal = goal.trim()
      if (trimmedGoal.length === 0) {
        return res.status(400).json({ error: 'goal cannot be empty or whitespace only' })
      }
      if (trimmedGoal.length > 500) {
        return res.status(400).json({ error: 'goal must be 500 characters or less' })
      }
      updateData.goal = trimmedGoal
    }

    // Handle due_date update
    if (due_date !== undefined) {
      if (due_date === null) {
        return res.status(400).json({ error: 'due_date cannot be set to null' })
      }
      const dueDateObj = new Date(due_date)
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({ error: 'due_date must be a valid date' })
      }
      // Format as ISO date string (YYYY-MM-DD)
      const dueDateISO = due_date.includes('T') 
        ? due_date.split('T')[0] 
        : due_date
      updateData.due_date = dueDateISO
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' })
    }

    const { data: updatedImage, error } = await supabase
      .from('vision_board_images')
      .update(updateData)
      .eq('id', imageId)
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating vision board image:', error)
      return res.status(500).json({ 
        error: 'Failed to update vision board image',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    return res.status(200).json({
      success: true,
      data: updatedImage,
      message: 'Vision board image updated successfully'
    })

  } catch (error: any) {
    console.error('Error in updateVisionBoardImage:', error)
    return res.status(500).json({ 
      error: 'Failed to update vision board image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function activateImage(res: NextApiResponse, imageId: string, userId: string) {
  try {
    const { data: updatedImage, error } = await supabase
      .from('vision_board_images')
      .update({ is_active: true })
      .eq('id', imageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to activate image' })
    }

    return res.status(200).json({
      success: true,
      data: updatedImage,
      message: 'Image activated for carousel display'
    })
  } catch (error) {
    console.error('Error activating image:', error)
    return res.status(500).json({ error: 'Failed to activate image' })
  }
}

async function deactivateImage(res: NextApiResponse, imageId: string, userId: string) {
  try {
    const { data: updatedImage, error } = await supabase
      .from('vision_board_images')
      .update({ is_active: false })
      .eq('id', imageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to deactivate image' })
    }

    return res.status(200).json({
      success: true,
      data: updatedImage,
      message: 'Image removed from carousel display'
    })
  } catch (error) {
    console.error('Error deactivating image:', error)
    return res.status(500).json({ error: 'Failed to deactivate image' })
  }
}

async function reorderImage(res: NextApiResponse, imageId: string, userId: string, newOrder: number) {
  if (typeof newOrder !== 'number' || newOrder < 0) {
    return res.status(400).json({ error: 'Valid display_order is required for reordering' })
  }

  try {
    // Use the database function for reordering
    const { error } = await supabase
      .rpc('reorder_vision_board_image', {
        p_image_id: imageId,
        p_new_order: newOrder
      })

    if (error) {
      console.error('Error reordering image:', error)
      return res.status(500).json({ error: 'Failed to reorder image' })
    }

    // Fetch the updated image
    const { data: updatedImage } = await supabase
      .from('vision_board_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single()

    return res.status(200).json({
      success: true,
      data: updatedImage,
      message: 'Image order updated successfully'
    })
  } catch (error) {
    console.error('Error in reorderImage:', error)
    return res.status(500).json({ error: 'Failed to reorder image' })
  }
}

async function deleteVisionBoardImage(req: NextApiRequest, res: NextApiResponse, imageId: string) {
  const { user_id } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Get image details for cleanup
    const { data: image } = await supabase
      .from('vision_board_images')
      .select('id, image_url, thumbnail_url')
      .eq('id', imageId)
      .eq('user_id', user_id)
      .single()

    if (!image) {
      return res.status(404).json({ error: 'Vision board image not found or access denied' })
    }

    // Delete from database first
    const { error: dbError } = await supabase
      .from('vision_board_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', user_id)

    if (dbError) {
      console.error('Error deleting image from database:', dbError)
      return res.status(500).json({ error: 'Failed to delete vision board image' })
    }

    // Extract filename from URL for storage cleanup
    if (image.image_url) {
      try {
        const url = new URL(image.image_url)
        const filename = url.pathname.split('/').pop()
        
        if (filename) {
          await supabase.storage
            .from('vision-board')
            .remove([filename])
        }
      } catch (storageError) {
        console.warn('Failed to clean up image file:', storageError)
        // Don't fail the request if storage cleanup fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Vision board image deleted successfully'
    })

  } catch (error) {
    console.error('Error in deleteVisionBoardImage:', error)
    return res.status(500).json({ error: 'Failed to delete vision board image' })
  }
} 