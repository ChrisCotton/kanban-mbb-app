import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { parseCSV, validateCSVFile, findDuplicateNames } from '../../../lib/utils/csv-parser'
import formidable, { IncomingForm } from 'formidable'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: any[]
  duplicatesSkipped: string[]
  categories: any[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the form data with file upload
    const form = new IncomingForm({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      keepExtensions: true,
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    // Get the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Validate file type and size
    const fileValidation = validateCSVFile({
      name: uploadedFile.originalFilename || uploadedFile.newFilename || 'unknown',
      size: uploadedFile.size,
      type: uploadedFile.mimetype || 'text/csv'
    } as File)

    if (!fileValidation.valid) {
      return res.status(400).json({ error: fileValidation.error })
    }

    // Read file content
    const csvContent = fs.readFileSync(uploadedFile.filepath, 'utf-8')

    // Parse CSV content
    const parseResult = parseCSV(csvContent)

    if (!parseResult.success && parseResult.errors.length > 0) {
      return res.status(400).json({
        error: 'CSV validation failed',
        parseErrors: parseResult.errors,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows
      })
    }

    // Check for duplicate names within the CSV
    const csvDuplicates = findDuplicateNames(parseResult.data)
    if (csvDuplicates.length > 0) {
      return res.status(400).json({
        error: 'Duplicate category names found in CSV',
        duplicates: csvDuplicates
      })
    }

    // Get existing categories to check for conflicts
    const { data: existingCategories, error: existingError } = await supabase
      .from('categories')
      .select('name, id')
      .eq('is_active', true)

    if (existingError) {
      console.error('Error fetching existing categories:', existingError)
      return res.status(500).json({ error: 'Failed to check existing categories' })
    }

    const existingNames = new Set(
      (existingCategories || []).map(cat => cat.name.toLowerCase())
    )

    // Separate new and existing categories
    const newCategories = parseResult.data.filter(
      cat => !existingNames.has(cat.name.toLowerCase())
    )
    const skippedCategories = parseResult.data.filter(
      cat => existingNames.has(cat.name.toLowerCase())
    )

    // Import new categories
    const importedCategories = []
    const importErrors = []

    for (const category of newCategories) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: category.name,
            hourly_rate_usd: category.hourly_rate_usd,
            color: category.color || '#3B82F6',
            is_active: category.is_active !== false,
            total_hours: 0 // Default value for new categories
          })
          .select()
          .single()

        if (error) {
          console.error(`Error inserting category "${category.name}":`, error)
          importErrors.push({
            name: category.name,
            error: error.message
          })
        } else {
          importedCategories.push(data)
        }
      } catch (error) {
        console.error(`Unexpected error inserting category "${category.name}":`, error)
        importErrors.push({
          name: category.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(uploadedFile.filepath)
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError)
    }

    const result: ImportResult = {
      success: importErrors.length === 0,
      imported: importedCategories.length,
      skipped: skippedCategories.length,
      errors: importErrors,
      duplicatesSkipped: skippedCategories.map(cat => cat.name),
      categories: importedCategories
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 