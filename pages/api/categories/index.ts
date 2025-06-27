import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Categories API called with method:', req.method)
  
  try {
    switch (req.method) {
      case 'GET':
        return await getCategories(req, res)
      case 'POST':
        return await createCategory(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
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

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      error: 'user_id is required' 
    })
  }

  try {
    // First get all categories for the user
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('created_by', user_id)
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Supabase error fetching categories:', categoriesError)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch categories', 
        details: categoriesError.message 
      })
    }

    // Add task counts using a single query with LEFT JOIN
    try {
      const { data: categoriesWithCounts, error: joinError } = await supabase
        .rpc('get_categories_with_task_counts', { 
          p_user_id: user_id 
        })

      if (!joinError && categoriesWithCounts) {
        return res.status(200).json({
          success: true,
          data: categoriesWithCounts,
          count: categoriesWithCounts.length
        })
      }
    } catch (rpcError) {
      console.log('RPC function not available, falling back to manual count')
    }

    // Fallback: Add task_count = 0 to all categories for now
    const categoriesWithZeroCounts = (categories || []).map(category => ({
      ...category,
      task_count: 0
    }))

    return res.status(200).json({
      success: true,
      data: categoriesWithZeroCounts,
      count: categoriesWithZeroCounts.length,
      note: 'Task counts temporarily set to 0 - database optimization pending'
    })

  } catch (error) {
    console.error('Error in getCategories:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch categories', 
      details: error.message 
    })
  }
}

async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  const { name, hourly_rate_usd, color, user_id } = req.body

  if (!name || !user_id || hourly_rate_usd === undefined) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: name, hourly_rate_usd, user_id'
    })
  }

  const numericRate = parseFloat(hourly_rate_usd)
  if (isNaN(numericRate) || numericRate < 0) {
    return res.status(400).json({ 
      success: false,
      error: 'hourly_rate_usd must be a positive number'
    })
  }

  try {
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        hourly_rate: numericRate,
        color: color || null,
        created_by: user_id,
        updated_by: user_id
      })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error creating category:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create category',
        details: error.message
      })
    }

    return res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    })

  } catch (error) {
    console.error('Error in createCategory:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create category',
      details: error.message
    })
  }
}
