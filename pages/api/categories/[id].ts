import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { validateUUID } from '../../../lib/utils/uuid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'Category ID is required' 
    })
  }

  // Validate UUID format
  try {
    validateUUID(id, 'Category ID')
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      error: error.message 
    })
  }

  console.log(`Categories API [${id}] called with method:`, req.method)
  
  try {
    switch (req.method) {
      case 'GET':
        return await getCategory(req, res, id)
      case 'PUT':
        return await updateCategory(req, res, id)
      case 'DELETE':
        return await deleteCategory(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ 
          success: false,
          error: `Method ${req.method} not allowed` 
        })
    }
  } catch (error) {
    console.error('Categories API error:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}

async function getCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error fetching category:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch category', 
        details: error.message 
      })
    }

    if (!category) {
      return res.status(404).json({ 
        success: false,
        error: 'Category not found' 
      })
    }

    return res.status(200).json({
      success: true,
      data: category
    })

  } catch (error) {
    console.error('Error in getCategory:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch category', 
      details: error.message 
    })
  }
}

async function updateCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { name, hourly_rate_usd, color, user_id } = req.body

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      error: 'user_id is required for authorization' 
    })
  }

  // Build update object only with provided fields
  const updateData: any = {
    updated_by: user_id
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Category name cannot be empty' 
      })
    }
    updateData.name = name.trim()
  }

  if (hourly_rate_usd !== undefined) {
    const numericRate = parseFloat(hourly_rate_usd)
    if (isNaN(numericRate) || numericRate < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'hourly_rate_usd must be a positive number'
      })
    }
    updateData.hourly_rate = numericRate
  }

  if (color !== undefined) {
    updateData.color = color
  }

  try {
    // First check if category exists and belongs to user
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('created_by')
      .eq('id', id)
      .single()

    if (checkError || !existingCategory) {
      return res.status(404).json({ 
        success: false,
        error: 'Category not found' 
      })
    }

    if (existingCategory.created_by !== user_id) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to update this category' 
      })
    }

    // Update the category
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error updating category:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update category',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    })

  } catch (error) {
    console.error('Error in updateCategory:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to update category',
      details: error.message
    })
  }
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  // Accept user_id from either request body or query parameters
  const user_id = req.body.user_id || req.query.user_id

  console.log('[API deleteCategory] Request received:', {
    categoryId: id,
    user_id: user_id,
    bodyUserId: req.body.user_id,
    queryUserId: req.query.user_id
  })

  if (!user_id) {
    console.error('[API deleteCategory] Missing user_id')
    return res.status(400).json({ 
      success: false,
      error: 'user_id is required for authorization (in body or query params)' 
    })
  }

  try {
    // First check if category exists and belongs to user
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('created_by')
      .eq('id', id)
      .single()

    console.log('[API deleteCategory] Category ownership check:', {
      categoryId: id,
      categoryCreatedBy: existingCategory?.created_by,
      requestUserId: user_id,
      match: existingCategory?.created_by === user_id
    })

    if (checkError || !existingCategory) {
      console.error('[API deleteCategory] Category not found:', checkError)
      return res.status(404).json({ 
        success: false,
        error: 'Category not found' 
      })
    }

    if (existingCategory.created_by !== user_id) {
      console.error('[API deleteCategory] Authorization failed:', {
        categoryOwner: existingCategory.created_by,
        requestUser: user_id,
        typeOfCategoryOwner: typeof existingCategory.created_by,
        typeOfRequestUser: typeof user_id
      })
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to delete this category' 
      })
    }

    console.log('[API deleteCategory] Authorization passed, deleting category')

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error deleting category:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete category',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    })

  } catch (error) {
    console.error('Error in deleteCategory:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete category',
      details: error.message
    })
  }
} 