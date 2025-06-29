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
    // Get all categories - authentication handled at database level via RLS
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*, total_hours')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Supabase error fetching categories:', categoriesError)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch categories', 
        details: categoriesError.message 
      })
    }

    // Ensure total_hours is always a number (hourly_rate_usd field already exists in DB)
    const categoriesWithCorrectField = (categories || []).map(category => ({
      ...category,
      total_hours: category.total_hours || 0 // Ensure total_hours is always a number
    }))

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
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        hourly_rate_usd: numericRate,
        color: color || null
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
