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
    return res.status(400).json({ error: 'Category ID is required' })
  }

  try {
    switch (method) {
      case 'GET':
        return await getCategory(req, res, id)
      case 'PUT':
        return await updateCategory(req, res, id)
      case 'DELETE':
        return await deleteCategory(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Category API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCategory(req: NextApiRequest, res: NextApiResponse, categoryId: string) {
  const { user_id, include_stats = 'false' } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        description,
        hourly_rate_usd,
        color,
        icon,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', categoryId)
      .eq('created_by', user_id)
      .single()

    if (error || !category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Add stats if requested
    if (include_stats === 'true') {
      // Get task count for this category
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)

      // Get total earnings for this category
      const { data: sessionsData } = await supabase
        .from('time_sessions')
        .select('earnings_usd')
        .eq('category_id', categoryId)
        .not('earnings_usd', 'is', null)

      const totalEarnings = sessionsData?.reduce((sum, session) => 
        sum + (parseFloat(session.earnings_usd) || 0), 0) || 0

      // Get total time spent
      const { data: timeData } = await supabase
        .from('time_sessions')
        .select('duration_seconds')
        .eq('category_id', categoryId)
        .not('duration_seconds', 'is', null)

      const totalSeconds = timeData?.reduce((sum, session) => 
        sum + (session.duration_seconds || 0), 0) || 0

      ;(category as any).stats = {
        task_count: taskCount || 0,
        total_earnings_usd: totalEarnings,
        total_time_seconds: totalSeconds,
        total_time_hours: Math.round((totalSeconds / 3600) * 100) / 100
      }
    }

    return res.status(200).json({
      success: true,
      data: category
    })

  } catch (error) {
    console.error('Error fetching category:', error)
    return res.status(500).json({ error: 'Failed to fetch category' })
  }
}

async function updateCategory(req: NextApiRequest, res: NextApiResponse, categoryId: string) {
  const { 
    name, 
    description, 
    hourly_rate_usd, 
    color, 
    icon, 
    is_active,
    user_id 
  } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  // Validation
  if (name && name.length > 100) {
    return res.status(400).json({ 
      error: 'Category name must be 100 characters or less' 
    })
  }

  if (hourly_rate_usd && (typeof hourly_rate_usd !== 'number' || hourly_rate_usd < 0)) {
    return res.status(400).json({ 
      error: 'hourly_rate_usd must be a positive number' 
    })
  }

  try {
    // Check if category exists and user owns it
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('created_by', user_id)
      .single()

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found or access denied' })
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existingCategory.name) {
      const { data: conflictCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('created_by', user_id)
        .eq('name', name)
        .neq('id', categoryId)
        .single()

      if (conflictCategory) {
        return res.status(409).json({ 
          error: 'Category with this name already exists' 
        })
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_by: user_id
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (hourly_rate_usd !== undefined) updateData.hourly_rate_usd = parseFloat(hourly_rate_usd.toFixed(2))
    if (color !== undefined) updateData.color = color || null
    if (icon !== undefined) updateData.icon = icon || null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('created_by', user_id)
      .select(`
        id,
        name,
        description,
        hourly_rate_usd,
        color,
        icon,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return res.status(500).json({ error: 'Failed to update category' })
    }

    return res.status(200).json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    })

  } catch (error) {
    console.error('Error in updateCategory:', error)
    return res.status(500).json({ error: 'Failed to update category' })
  }
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse, categoryId: string) {
  const { user_id, reassign_to } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Check if category exists and user owns it
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('created_by', user_id)
      .single()

    if (!category) {
      return res.status(404).json({ error: 'Category not found or access denied' })
    }

    // Check if there are tasks using this category
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)

    if (taskCount && taskCount > 0) {
      if (reassign_to) {
        // Verify the reassignment category exists and belongs to the user
        const { data: reassignCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('id', reassign_to)
          .eq('created_by', user_id)
          .single()

        if (!reassignCategory) {
          return res.status(400).json({ 
            error: 'Invalid reassignment category' 
          })
        }

        // Reassign tasks to the new category
        await supabase
          .from('tasks')
          .update({ category_id: reassign_to })
          .eq('category_id', categoryId)

        // Reassign time sessions to the new category
        await supabase
          .from('time_sessions')
          .update({ category_id: reassign_to })
          .eq('category_id', categoryId)
      } else {
        return res.status(400).json({ 
          error: `Cannot delete category with ${taskCount} associated tasks. Provide reassign_to category ID or reassign tasks manually.`,
          task_count: taskCount
        })
      }
    }

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('created_by', user_id)

    if (error) {
      console.error('Error deleting category:', error)
      return res.status(500).json({ error: 'Failed to delete category' })
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      reassigned_tasks: taskCount || 0
    })

  } catch (error) {
    console.error('Error in deleteCategory:', error)
    return res.status(500).json({ error: 'Failed to delete category' })
  }
} 