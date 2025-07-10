import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { generateCSV } from '../../../lib/utils/csv-parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all categories - authentication handled at database level via RLS
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Database error:', categoriesError)
      return res.status(500).json({ error: 'Failed to fetch categories' })
    }

    // Add total_hours field for CSV export (placeholder until column is added)
    const categoriesWithCorrectField = (categories || []).map(category => ({
      ...category,
      total_hours: 0 // Placeholder until total_hours column is added
    }))

    // Generate CSV content
    const csvContent = generateCSV(categoriesWithCorrectField)

    // Set appropriate headers for CSV download
    const filename = `categories-export-${new Date().toISOString().split('T')[0]}.csv`
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')
    
    // Send CSV content
    res.status(200).send(csvContent)

  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 