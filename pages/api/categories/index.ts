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
  try {
    // Get authenticated user from token
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      // Categories are user-specific, require authentication
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required to view categories'
      })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ 
        success: false,
        error: 'Invalid authentication token'
      })
    }
    
    const userId = user.id
    console.log('Fetching categories for user:', userId)
    
    // Fetch categories - filter by current user only
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .eq('created_by', userId)
    
    const { data: categories, error: categoriesError } = await query.order('name', { ascending: true })

    if (categoriesError) {
      console.error('Supabase error fetching categories:', categoriesError)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch categories', 
        details: categoriesError.message 
      })
    }

    // Add total_hours field (will be implemented in future migration)
    const categoriesWithCorrectField = (categories || []).map(category => ({
      ...category,
      total_hours: 0 // Placeholder until total_hours column is added
    }))

    console.log(`Returning ${categoriesWithCorrectField.length} categories for user ${userId}`)

    return res.status(200).json({
      success: true,
      data: categoriesWithCorrectField,
      count: categoriesWithCorrectField.length
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
  const { name, hourly_rate_usd, color } = req.body

  if (!name || hourly_rate_usd === undefined) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: name, hourly_rate_usd'
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
    // Get authenticated user from token
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required'
      })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ 
        success: false,
        error: 'Invalid authentication token'
      })
    }
    
    console.log('Creating category for user:', user.id)
    
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        hourly_rate_usd: numericRate,
        color: color || null,
        created_by: user.id,
        updated_by: user.id
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
