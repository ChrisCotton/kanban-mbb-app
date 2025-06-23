import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CategoryRow {
  name: string
  description?: string
  hourly_rate_usd: number
  color?: string
  icon?: string
  is_active?: boolean
}

interface BulkUploadResult {
  success: boolean
  total_rows: number
  successful_imports: number
  failed_imports: number
  errors: Array<{
    row: number
    data: any
    error: string
  }>
  imported_categories: any[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { categories_data, user_id, overwrite_existing = false } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  if (!categories_data || !Array.isArray(categories_data)) {
    return res.status(400).json({ 
      error: 'categories_data must be an array of category objects' 
    })
  }

  if (categories_data.length === 0) {
    return res.status(400).json({ error: 'No categories provided' })
  }

  if (categories_data.length > 100) {
    return res.status(400).json({ 
      error: 'Maximum 100 categories allowed per bulk upload' 
    })
  }

  try {
    const result = await processBulkUpload(categories_data, user_id, overwrite_existing)
    
    return res.status(200).json(result)

  } catch (error) {
    console.error('Bulk upload error:', error)
    return res.status(500).json({ 
      error: 'Internal server error during bulk upload',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function processBulkUpload(
  categoriesData: any[], 
  userId: string, 
  overwriteExisting: boolean
): Promise<BulkUploadResult> {
  const result: BulkUploadResult = {
    success: false,
    total_rows: categoriesData.length,
    successful_imports: 0,
    failed_imports: 0,
    errors: [],
    imported_categories: []
  }

  // Get existing categories for this user
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('name, id')
    .eq('created_by', userId)

  const existingNames = new Set(existingCategories?.map(cat => cat.name.toLowerCase()) || [])

  for (let i = 0; i < categoriesData.length; i++) {
    const rowData = categoriesData[i]
    const rowNumber = i + 1

    try {
      // Validate the row data
      const validationError = validateCategoryRow(rowData, rowNumber)
      if (validationError) {
        result.errors.push({
          row: rowNumber,
          data: rowData,
          error: validationError
        })
        result.failed_imports++
        continue
      }

      const categoryRow: CategoryRow = {
        name: rowData.name.trim(),
        description: rowData.description?.trim() || null,
        hourly_rate_usd: parseFloat(parseFloat(rowData.hourly_rate_usd).toFixed(2)),
        color: rowData.color?.trim() || null,
        icon: rowData.icon?.trim() || null,
        is_active: rowData.is_active !== undefined ? Boolean(rowData.is_active) : true
      }

      // Check for duplicates in current batch
      const duplicateInBatch = categoriesData
        .slice(0, i)
        .some(prevRow => prevRow.name?.toLowerCase() === categoryRow.name.toLowerCase())

      if (duplicateInBatch) {
        result.errors.push({
          row: rowNumber,
          data: rowData,
          error: 'Duplicate category name in upload batch'
        })
        result.failed_imports++
        continue
      }

      // Check if category already exists
      if (existingNames.has(categoryRow.name.toLowerCase())) {
        if (!overwriteExisting) {
          result.errors.push({
            row: rowNumber,
            data: rowData,
            error: 'Category with this name already exists'
          })
          result.failed_imports++
          continue
        } else {
          // Update existing category
          const existingCategory = existingCategories?.find(
            cat => cat.name.toLowerCase() === categoryRow.name.toLowerCase()
          )

          if (existingCategory) {
            const { data: updatedCategory, error } = await supabase
              .from('categories')
              .update({
                description: categoryRow.description,
                hourly_rate_usd: categoryRow.hourly_rate_usd,
                color: categoryRow.color,
                icon: categoryRow.icon,
                is_active: categoryRow.is_active,
                updated_by: userId
              })
              .eq('id', existingCategory.id)
              .eq('created_by', userId)
              .select('*')
              .single()

            if (error) {
              result.errors.push({
                row: rowNumber,
                data: rowData,
                error: `Failed to update existing category: ${error.message}`
              })
              result.failed_imports++
              continue
            }

            result.imported_categories.push(updatedCategory)
            result.successful_imports++
            continue
          }
        }
      }

      // Create new category
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: categoryRow.name,
          description: categoryRow.description,
          hourly_rate_usd: categoryRow.hourly_rate_usd,
          color: categoryRow.color,
          icon: categoryRow.icon,
          is_active: categoryRow.is_active,
          created_by: userId,
          updated_by: userId
        })
        .select('*')
        .single()

      if (error) {
        result.errors.push({
          row: rowNumber,
          data: rowData,
          error: `Failed to create category: ${error.message}`
        })
        result.failed_imports++
        continue
      }

      result.imported_categories.push(newCategory)
      result.successful_imports++

      // Add to existing names to prevent duplicates in remaining rows
      existingNames.add(categoryRow.name.toLowerCase())

    } catch (error) {
      result.errors.push({
        row: rowNumber,
        data: rowData,
        error: `Unexpected error: ${error.message}`
      })
      result.failed_imports++
    }
  }

  result.success = result.successful_imports > 0
  return result
}

function validateCategoryRow(rowData: any, rowNumber: number): string | null {
  // Check required fields
  if (!rowData.name || typeof rowData.name !== 'string') {
    return 'Name is required and must be a string'
  }

  if (rowData.name.trim().length === 0) {
    return 'Name cannot be empty'
  }

  if (rowData.name.length > 100) {
    return 'Name must be 100 characters or less'
  }

  if (!rowData.hourly_rate_usd && rowData.hourly_rate_usd !== 0) {
    return 'hourly_rate_usd is required'
  }

  const hourlyRate = parseFloat(rowData.hourly_rate_usd)
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return 'hourly_rate_usd must be a positive number'
  }

  if (hourlyRate > 9999999.99) {
    return 'hourly_rate_usd cannot exceed $9,999,999.99'
  }

  // Validate optional fields
  if (rowData.description && typeof rowData.description !== 'string') {
    return 'Description must be a string'
  }

  if (rowData.color && typeof rowData.color !== 'string') {
    return 'Color must be a string'
  }

  if (rowData.color && rowData.color.length > 7) {
    return 'Color must be 7 characters or less (hex color format)'
  }

  if (rowData.icon && typeof rowData.icon !== 'string') {
    return 'Icon must be a string'
  }

  if (rowData.icon && rowData.icon.length > 10) {
    return 'Icon must be 10 characters or less'
  }

  if (rowData.is_active !== undefined && typeof rowData.is_active !== 'boolean') {
    return 'is_active must be a boolean (true/false)'
  }

  return null
}

// Export helper function for generating CSV template
export function generateCsvTemplate(): string {
  const headers = [
    'name',
    'description', 
    'hourly_rate_usd',
    'color',
    'icon',
    'is_active'
  ]

  const sampleData = [
    ['Development', 'Software development and coding tasks', '75.00', '#3B82F6', '💻', 'true'],
    ['Design', 'UI/UX design and creative work', '65.00', '#8B5CF6', '🎨', 'true'],
    ['Consulting', 'Client consultation and advisory work', '100.00', '#10B981', '💼', 'true'],
    ['Writing', 'Content creation and documentation', '50.00', '#F59E0B', '✍️', 'true'],
    ['Research', 'Research and analysis tasks', '60.00', '#EF4444', '🔍', 'true']
  ]

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
} 