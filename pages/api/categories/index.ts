import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCategories(req, res)
      case 'POST':
        return await createCategory(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Categories API error:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, active_only = 'false', include_stats = 'false' } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    let query = supabase
      .from('categories')
      .select(`
        id,
        name,
        hourly_rate,
        color,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('created_by', user_id)
      .order('name', { ascending: true })

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return res.status(500).json({ error: 'Failed to fetch categories', details: error.message })
    }

    // Calculate additional stats if requested
    if (include_stats === 'true' && categories) {
      for (const category of categories) {
        // Get task count for this category
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)

        // Get total earnings for this category
        const { data: sessionsData } = await supabase
          .from('time_sessions')
          .select('earnings_usd')
          .eq('category_id', category.id)
          .not('earnings_usd', 'is', null)

        const totalEarnings = sessionsData?.reduce((sum, session) => 
          sum + (parseFloat(session.earnings_usd) || 0), 0) || 0

        // Get total time spent
        const { data: timeData } = await supabase
          .from('time_sessions')
          .select('duration_seconds')
          .eq('category_id', category.id)
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
    }

    return res.status(200).json({
      success: true,
      data: categories,
      count: categories?.length || 0
    })

  } catch (error) {
    console.error('Error in getCategories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories', details: error.message })
  }
}

async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  console.log('Creating category with data:', req.body)
  
  const { 
    name, 
    description, 
    hourly_rate_usd, 
    color, 
    icon, 
    is_active = true,
    user_id 
  } = req.body

  // Validation
  if (!name || hourly_rate_usd === undefined || !user_id) {
    console.log('Validation failed - missing fields:', { 
      name: !!name, 
      hourly_rate: hourly_rate_usd !== undefined, 
      user_id: !!user_id 
    })
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields',
      required: ['name', 'hourly_rate', 'user_id'],
      received: { name, hourly_rate: hourly_rate_usd, user_id }
    })
  }

  const numericRate = parseFloat(hourly_rate_usd)
  if (isNaN(numericRate) || numericRate < 0) {
    console.log('Validation failed - invalid hourly rate:', hourly_rate_usd, typeof hourly_rate_usd)
    return res.status(400).json({ 
      success: false,
      error: 'hourly_rate must be a positive number',
      received: hourly_rate_usd
    })
  }

  if (name.length > 100) {
    console.log('Validation failed - name too long:', name.length)
    return res.status(400).json({ 
      success: false,
      error: 'Category name must be 100 characters or less' 
    })
  }

  try {
    console.log('Checking for existing category...')
    // Check if category name already exists for this user
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .eq('created_by', user_id)
      .eq('name', name)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing category:', checkError)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to check existing categories',
        details: checkError.message
      })
    }

    if (existingCategory) {
      console.log('Category already exists:', existingCategory)
      return res.status(409).json({ 
        success: false,
        error: 'Category with this name already exists' 
      })
    }

    console.log('Creating new category...')
    // Create the category with required fields
    const categoryData = {
      name: name.trim(),
      hourly_rate: parseFloat(numericRate.toFixed(2)),
      color: color || null,
      is_active: is_active !== false,
      created_by: user_id,
      updated_by: user_id
    }
    
    console.log('Category data to insert:', categoryData)

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select(`
        id,
        name,
        hourly_rate,
        color,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .single()

    if (error) {
      console.error('Error creating category in database:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create category',
        details: error.message,
        code: error.code
      })
    }

    console.log('Category created successfully:', newCategory)
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