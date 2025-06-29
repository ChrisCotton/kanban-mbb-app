import { NextApiRequest, NextApiResponse } from 'next'
import { generateCSVTemplate } from '../../../lib/utils/csv-parser'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Generate CSV template content
    const csvTemplate = generateCSVTemplate()

    // Set appropriate headers for CSV download
    const filename = 'categories-template.csv'
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Length', Buffer.byteLength(csvTemplate, 'utf8'))
    
    // Send CSV template content
    res.status(200).send(csvTemplate)

  } catch (error) {
    console.error('Template generation error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 