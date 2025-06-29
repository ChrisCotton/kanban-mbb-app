import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { parseCSV, validateCSVFile, findDuplicateNames } from '../../../lib/utils/csv-parser'
import formidable, { IncomingForm } from 'formidable'
import fs from 'fs'

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

interface ValidationResult {
  valid: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  parseErrors: any[]
  csvDuplicates: string[]
  existingDuplicates: string[]
  preview: any[]
  warnings: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

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

    // Check for duplicate names within the CSV
    const csvDuplicates = findDuplicateNames(parseResult.data)

    // Get existing categories to check for conflicts
    const { data: existingCategories, error: existingError } = await supabase
      .from('categories')
      .select('name, id')
      .eq('user_id', user.id)

    if (existingError) {
      console.error('Error fetching existing categories:', existingError)
      return res.status(500).json({ error: 'Failed to check existing categories' })
    }

    const existingNames = new Set(
      (existingCategories || []).map(cat => cat.name.toLowerCase())
    )

    // Find categories that would conflict with existing ones
    const existingDuplicates = parseResult.data
      .filter(cat => existingNames.has(cat.name.toLowerCase()))
      .map(cat => cat.name)

    // Generate warnings
    const warnings = []
    if (existingDuplicates.length > 0) {
      warnings.push(`${existingDuplicates.length} categories already exist and will be skipped`)
    }
    if (parseResult.errors.length > 0) {
      warnings.push(`${parseResult.errors.length} rows have validation errors`)
    }
    if (csvDuplicates.length > 0) {
      warnings.push(`${csvDuplicates.length} duplicate names found in CSV`)
    }

    // Create preview data (first 10 valid rows)
    const preview = parseResult.data.slice(0, 10).map((row, index) => ({
      ...row,
      isExisting: existingNames.has(row.name.toLowerCase()),
      preview_index: index + 1
    }))

    // Clean up uploaded file
    try {
      fs.unlinkSync(uploadedFile.filepath)
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError)
    }

    const result: ValidationResult = {
      valid: parseResult.success && csvDuplicates.length === 0,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validRows,
      invalidRows: parseResult.totalRows - parseResult.validRows,
      parseErrors: parseResult.errors,
      csvDuplicates,
      existingDuplicates,
      preview,
      warnings
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('Validation error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 