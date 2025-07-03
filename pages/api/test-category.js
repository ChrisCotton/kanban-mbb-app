import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Testing category creation...')
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL
    })

    // Test category creation with minimal data
    const testCategory = {
      name: `Test Category ${Date.now()}`,
      hourly_rate_usd: 75.00,
      color: '#3B82F6'
    }

    console.log('Attempting to insert:', testCategory)

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert(testCategory)
      .select('*')
      .single()

    console.log('Insert result:', { data: newCategory, error })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(400).json({
        success: false,
        error: 'Database error',
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    return res.status(200).json({
      success: true,
      data: newCategory,
      message: 'Test category created successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack
    })
  }
} 